"""
Vector Search Service for Underfoot Underground Travel Planner
Python implementation for backend integration (future use)

This service provides vector search capabilities using Supabase pgvector
and OpenAI embeddings for intelligent caching and semantic similarity matching.
"""

import os
import asyncio
import logging
from typing import List, Dict, Optional, Union, Tuple
import json
from datetime import datetime, timedelta

try:
    import openai
    from supabase import create_client, Client
    import numpy as np
    from dataclasses import dataclass
    from enum import Enum
except ImportError as e:
    logging.warning(f"Missing Python dependencies for vector service: {e}")
    logging.warning("Install with: pip install openai supabase numpy")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
@dataclass
class VectorConfig:
    embedding_model: str = "text-embedding-ada-002"
    embedding_dimensions: int = 1536
    similarity_threshold: float = 0.85
    cache_ttl_minutes: int = 30
    max_cache_results: int = 5
    batch_size: int = 10
    max_retries: int = 3

class CacheSource(Enum):
    MEMORY = "memory"
    VECTOR = "vector"
    TRADITIONAL = "traditional"
    MISS = "miss"

@dataclass
class CacheResult:
    cached: bool
    source: CacheSource
    results: Optional[Dict]
    similarity: Optional[float] = None
    keywords: Optional[List[Dict]] = None
    error: Optional[str] = None

class VectorSearchService:
    """Advanced vector search service with intelligent caching"""
    
    def __init__(self):
        self.config = VectorConfig()
        self.openai_client = None
        self.supabase_client = None
        self.supabase_admin = None
        self.memory_cache = {}
        self.cache_metrics = {
            'hits': 0,
            'misses': 0,
            'vector_hits': 0,
            'vector_misses': 0,
            'total_queries': 0,
            'avg_response_time': 0,
            'last_reset': datetime.now()
        }
        
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize OpenAI and Supabase clients"""
        try:
            # Initialize OpenAI client
            if os.getenv('OPENAI_API_KEY'):
                openai.api_key = os.getenv('OPENAI_API_KEY')
                self.openai_client = openai
                logger.info("OpenAI client initialized")
            else:
                logger.warning("OPENAI_API_KEY not found - embeddings disabled")
            
            # Initialize Supabase clients
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
            supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if supabase_url and supabase_anon_key:
                self.supabase_client = create_client(supabase_url, supabase_anon_key)
                logger.info("Supabase client initialized")
                
                if supabase_service_key:
                    self.supabase_admin = create_client(supabase_url, supabase_service_key)
                    logger.info("Supabase admin client initialized")
            else:
                logger.warning("Supabase credentials not found - database disabled")
                
        except Exception as e:
            logger.error(f"Failed to initialize clients: {e}")
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embeddings using OpenAI API"""
        if not self.openai_client:
            logger.warning("OpenAI client not available - using fallback")
            return None
        
        try:
            response = await self.openai_client.Embedding.acreate(
                model=self.config.embedding_model,
                input=text.strip()
            )
            return response['data'][0]['embedding']
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            return None
    
    async def find_similar_cached_results(
        self, 
        query: str, 
        location: str, 
        similarity_threshold: Optional[float] = None
    ) -> CacheResult:
        """Find similar cached results using vector similarity"""
        if similarity_threshold is None:
            similarity_threshold = self.config.similarity_threshold
        
        try:
            # Generate embeddings
            query_embedding = await self.generate_embedding(query)
            location_embedding = await self.generate_embedding(location)
            
            if not query_embedding or not location_embedding:
                return await self._fallback_cache_lookup(query, location)
            
            # Call Supabase function for vector similarity search
            response = await self.supabase_client.rpc(
                'find_similar_cached_query',
                {
                    'input_query_embedding': query_embedding,
                    'input_location_embedding': location_embedding,
                    'similarity_threshold': similarity_threshold,
                    'result_limit': self.config.max_cache_results
                }
            ).execute()
            
            if response.data and len(response.data) > 0:
                best_match = response.data[0]
                logger.info(f"Vector cache hit: {best_match['combined_similarity']:.3f} similarity")
                
                # Update access count
                await self.supabase_client.rpc(
                    'update_cache_access', 
                    {'cache_id': best_match['id']}
                ).execute()
                
                self.cache_metrics['vector_hits'] += 1
                
                return CacheResult(
                    cached=True,
                    source=CacheSource.VECTOR,
                    results=best_match['cached_results'],
                    similarity=best_match['combined_similarity']
                )
            
            self.cache_metrics['vector_misses'] += 1
            return CacheResult(cached=False, source=CacheSource.MISS, results=None)
            
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return CacheResult(
                cached=False, 
                source=CacheSource.MISS, 
                results=None, 
                error=str(e)
            )
    
    async def _fallback_cache_lookup(self, query: str, location: str) -> CacheResult:
        """Fallback to traditional hash-based cache lookup"""
        try:
            query_hash = self._generate_cache_key(query, location)
            
            response = await self.supabase_client.table('search_results').select('*').eq(
                'query_hash', query_hash
            ).gt('expires_at', datetime.now().isoformat()).single().execute()
            
            if response.data:
                self.cache_metrics['hits'] += 1
                return CacheResult(
                    cached=True,
                    source=CacheSource.TRADITIONAL,
                    results=json.loads(response.data['results_json'])
                )
            
        except Exception as e:
            logger.debug(f"Traditional cache lookup failed: {e}")
        
        self.cache_metrics['misses'] += 1
        return CacheResult(cached=False, source=CacheSource.MISS, results=None)
    
    async def store_semantic_cache(
        self, 
        query: str, 
        location: str, 
        results: Dict, 
        ttl_minutes: Optional[int] = None
    ) -> bool:
        """Store search results with vector embeddings in semantic cache"""
        if ttl_minutes is None:
            ttl_minutes = self.config.cache_ttl_minutes
        
        try:
            query_embedding = await self.generate_embedding(query)
            location_embedding = await self.generate_embedding(location)
            
            if not query_embedding or not location_embedding:
                return await self._fallback_cache_store(query, location, results, ttl_minutes)
            
            expires_at = datetime.now() + timedelta(minutes=ttl_minutes)
            
            await self.supabase_client.table('semantic_cache').insert({
                'original_query': query.strip(),
                'normalized_query': query.strip().lower(),
                'query_embedding': query_embedding,
                'location': location.strip(),
                'location_embedding': location_embedding,
                'cached_results': results,
                'similarity_threshold': self.config.similarity_threshold,
                'expires_at': expires_at.isoformat()
            }).execute()
            
            # Also store in traditional cache as backup
            await self._fallback_cache_store(query, location, results, ttl_minutes)
            
            logger.info(f"Stored semantic cache for query: {query[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Semantic cache store error: {e}")
            return False
    
    async def _fallback_cache_store(
        self, 
        query: str, 
        location: str, 
        results: Dict, 
        ttl_minutes: int
    ) -> bool:
        """Fallback to traditional cache storage"""
        try:
            query_hash = self._generate_cache_key(query, location)
            expires_at = datetime.now() + timedelta(minutes=ttl_minutes)
            
            await self.supabase_client.table('search_results').upsert({
                'query_hash': query_hash,
                'location': location.strip(),
                'intent': query.strip(),
                'results_json': json.dumps(results),
                'expires_at': expires_at.isoformat()
            }, on_conflict='query_hash').execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Traditional cache store error: {e}")
            return False
    
    async def find_underground_keywords(
        self, 
        query: str, 
        similarity_threshold: float = 0.75
    ) -> List[Dict]:
        """Find relevant underground keywords for query enhancement"""
        try:
            query_embedding = await self.generate_embedding(query)
            
            if not query_embedding:
                return []
            
            response = await self.supabase_client.rpc(
                'find_underground_keywords',
                {
                    'query_embedding': query_embedding,
                    'similarity_threshold': similarity_threshold,
                    'result_limit': 10
                }
            ).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Underground keywords search error: {e}")
            return []
    
    async def populate_keyword_embeddings(self) -> bool:
        """Populate keyword embeddings (for initial setup)"""
        if not self.supabase_admin:
            logger.error("Service role required for keyword embedding population")
            return False
        
        try:
            # Get keywords without embeddings
            response = await self.supabase_admin.table('underground_keywords').select(
                'id, keyword'
            ).is_('embedding', 'null').execute()
            
            keywords = response.data or []
            
            if not keywords:
                logger.info("All keywords already have embeddings")
                return True
            
            logger.info(f"Generating embeddings for {len(keywords)} keywords...")
            
            # Process in batches
            processed_count = 0
            for i in range(0, len(keywords), self.config.batch_size):
                batch = keywords[i:i + self.config.batch_size]
                
                for keyword_data in batch:
                    embedding = await self.generate_embedding(keyword_data['keyword'])
                    if embedding:
                        await self.supabase_admin.table('underground_keywords').update({
                            'embedding': embedding,
                            'updated_at': datetime.now().isoformat()
                        }).eq('id', keyword_data['id']).execute()
                        processed_count += 1
                
                # Add delay between batches
                if i + self.config.batch_size < len(keywords):
                    await asyncio.sleep(1)
            
            logger.info(f"Successfully generated embeddings for {processed_count} keywords")
            return True
            
        except Exception as e:
            logger.error(f"Keyword embedding population error: {e}")
            return False
    
    async def get_cache_analytics(self) -> Dict:
        """Get comprehensive cache analytics"""
        try:
            db_stats = None
            if self.supabase_admin:
                response = await self.supabase_admin.rpc('get_cache_statistics').execute()
                db_stats = response.data
            
            hit_rate = 0
            if self.cache_metrics['total_queries'] > 0:
                hit_rate = (self.cache_metrics['hits'] / self.cache_metrics['total_queries']) * 100
            
            vector_queries = self.cache_metrics['vector_hits'] + self.cache_metrics['vector_misses']
            vector_hit_rate = 0
            if vector_queries > 0:
                vector_hit_rate = (self.cache_metrics['vector_hits'] / vector_queries) * 100
            
            return {
                'database': db_stats,
                'memory': {
                    'size': len(self.memory_cache),
                    'hit_rate': f"{hit_rate:.2f}%",
                    'vector_hit_rate': f"{vector_hit_rate:.2f}%",
                    'total_queries': self.cache_metrics['total_queries'],
                    'avg_response_time': f"{self.cache_metrics['avg_response_time']:.2f}ms"
                },
                'config': {
                    'embedding_model': self.config.embedding_model,
                    'similarity_threshold': self.config.similarity_threshold,
                    'cache_ttl_minutes': self.config.cache_ttl_minutes
                },
                'last_reset': self.cache_metrics['last_reset'].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Cache analytics error: {e}")
            return {'error': str(e)}
    
    def _generate_cache_key(self, query: str, location: str) -> str:
        """Generate cache key for traditional caching"""
        import base64
        import hashlib
        
        normalized = f"{query.strip().lower()}|{location.strip().lower()}"
        hash_obj = hashlib.md5(normalized.encode())
        return base64.b64encode(hash_obj.digest()).decode().replace('=', '').replace('+', '').replace('/', '')[:32]
    
    def reset_metrics(self):
        """Reset cache metrics"""
        self.cache_metrics = {
            'hits': 0,
            'misses': 0,
            'vector_hits': 0,
            'vector_misses': 0,
            'total_queries': 0,
            'avg_response_time': 0,
            'last_reset': datetime.now()
        }
        logger.info("Cache metrics reset")


# Global service instance
vector_service = VectorSearchService()

# Convenience functions for easy import
async def enhanced_search_with_vectors(query: str, location: str) -> Dict:
    """Enhanced search with vector similarity and keyword enrichment"""
    try:
        # Try to find similar cached results
        cache_result = await vector_service.find_similar_cached_results(query, location)
        
        if cache_result.cached:
            return {
                'cached': True,
                'source': cache_result.source.value,
                'results': cache_result.results,
                'similarity': cache_result.similarity
            }
        
        # Find relevant underground keywords for context
        keywords = await vector_service.find_underground_keywords(query)
        
        return {
            'cached': False,
            'relevant_keywords': keywords,
            'enhanced_query': query,
            'location': location
        }
        
    except Exception as e:
        logger.error(f"Enhanced search error: {e}")
        return {
            'cached': False,
            'relevant_keywords': [],
            'enhanced_query': query,
            'location': location,
            'error': str(e)
        }

# Example usage and testing
if __name__ == "__main__":
    async def test_vector_service():
        """Test the vector service functionality"""
        print("Testing Vector Search Service...")
        
        # Test keyword search
        keywords = await vector_service.find_underground_keywords("subway transportation")
        print(f"Found {len(keywords)} relevant keywords")
        
        # Test cache lookup
        cache_result = await vector_service.find_similar_cached_results(
            "underground spots", "New York"
        )
        print(f"Cache lookup result: {cache_result.cached}")
        
        # Test analytics
        analytics = await vector_service.get_cache_analytics()
        print("Analytics:", json.dumps(analytics, indent=2, default=str))
    
    # Run test if executed directly
    asyncio.run(test_vector_service())