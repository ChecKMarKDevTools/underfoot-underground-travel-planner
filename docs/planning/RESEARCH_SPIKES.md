# Research Spikes & Future Features Documentation

_Research Phase: January 27, 2025_

## 🎨 Typography Research

### Google Flavors Font (Headers)

- **Designer**: Sideshow
- **Style**: Playful and rugged typeface with innovative twists
- **Characteristics**: Thick, rounded lines with quirky, uneven shapes
- **Use Case**: Perfect for mystical underground theme headers
- **Scripts**: Latin and Latin-ext support
- **Underground Theme Fit**: ✅ Excellent - adds character and mystical feel

### Body Font Recommendation: Inter

- **Rationale**: Clean, accessible, designed specifically for UI readability
- **Accessibility**: WCAG 2.1 AA compliant, excellent contrast ratios
- **Pairing Logic**: Simple sans-serif balances quirky display fonts
- **Performance**: Optimized for web, good loading characteristics
- **Underground Theme Fit**: ✅ Perfect complement - doesn't compete with headers

### Color Scheme Compatibility

- **Strategy**: Keep Dream Horizon colors complementary to existing logos
- **Primary Colors**: Pearl White (#FDFDFE), Midnight Navy (#0D1B2A), Aurora Purple (#9D4EDD)
- **Logo Integration**: Test colors against logo variations to avoid clashing
- **Accessibility**: Maintain 4.5:1 contrast ratios minimum

---

## 🧠 Smart Query Understanding Research

### Current Problem

User queries like "graveyards" should intelligently expand to include related concepts like "haunted houses", "spooky locations", "ghost tours", etc.

### Research Findings

#### 1. Semantic Query Expansion Techniques

**Source**: Academic research on query expansion with word embeddings

- **Multi-Query RAG**: Generate multiple similar queries from user input
- **Vector Similarity**: Use OpenAI embeddings to find semantically related terms
- **Hybrid Approach**: Combine keyword expansion with semantic understanding

#### 2. TripAdvisor's Implementation

**Source**: TripAdvisor engineering blog on semantic search

- **Approach**: Deep learning models for semantic understanding
- **Technology**: Vector databases (Qdrant) for similarity search
- **Strategy**: Hybrid retrieval and re-ranking
- **Performance**: \~200ms latency with sophisticated processing

#### 3. Practical Implementation Strategy

```javascript
// Example semantic expansion for "graveyards"
const semanticExpansions = {
  graveyards: [
    'haunted houses',
    'ghost tours',
    'spooky locations',
    'cemetery tours',
    'paranormal sites',
    'historic burial grounds',
    'supernatural experiences',
    'gothic architecture',
    'dark tourism',
  ],
  speakeasies: [
    'hidden bars',
    'secret cocktail lounges',
    'prohibition era',
    'craft cocktails',
    'underground bars',
    'intimate venues',
  ],
  'street art': [
    'murals',
    'graffiti tours',
    'urban art',
    'public art',
    'local artists',
    'creative districts',
    'art walks',
  ],
};
```

### Implementation Plan

1. **Phase 1**: Build static semantic maps for common travel themes
2. **Phase 2**: Use OpenAI embeddings for dynamic similarity
3. **Phase 3**: Implement multi-query generation with RAG approach
4. **Phase 4**: Add user feedback loop for learning preferences

---

## 🌐 Google APIs Research

### Beyond Maps & Places: Additional APIs for Travel Discovery

#### 1. Google Knowledge Graph API ⭐

**Status**: Migrating to Cloud Enterprise Knowledge Graph

- **Use Case**: Enrich location data with factual information
- **Benefits**: Get notable entities, predict completions, annotate content
- **Example**: "Eiffel Tower" → height, history, related landmarks
- **Integration**: Perfect for providing context about discovered places
- **Cost**: Enterprise pricing, not suitable for production-critical services

#### 2. Google Custom Search API ⭐⭐

**High Priority for Underground Travel**

- **Use Case**: Create custom search engines for travel content
- **Benefits**: Search specific domains (local blogs, indie sites)
- **Underground Fit**: Perfect for finding non-mainstream content
- **Configuration**: Filter to local blogs, indie publications, community sites
- **Cost**: Free tier: 100 queries/day, Paid: $5/1000 queries

#### 3. Google Vision API ⭐

**Use Case**: Analyze images from search results

- **Features**: Label detection, text extraction, landmark recognition
- **Benefits**: Automatically categorize venues, extract info from images
- **Underground Application**: Identify authentic/local venues from photos
- **Integration**: Process venue images for better categorization

#### 4. Google Cloud Search API

**Use Case**: Internal content search and organization

- **Benefits**: Search through aggregated content, personalization
- **Application**: Create internal knowledge base of discovered places

### Recommended API Integration Priority

1. **Custom Search API** (immediate value for underground content)
2. **Vision API** (image analysis for venue categorization)
3. **Knowledge Graph API** (factual enhancement, but enterprise cost)

---

## 🔮 Future Features Architecture

### 1. Actions (Share/Save) System

#### Database Schema (Supabase)

```sql
-- User saved places
CREATE TABLE user_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  place_data JSONB NOT NULL,
  saved_at TIMESTAMP DEFAULT NOW(),
  tags TEXT[],
  notes TEXT
);

-- Shared discovery lists
CREATE TABLE shared_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  places JSONB[] NOT NULL,
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- List shares and collaborations
CREATE TABLE list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shared_lists(id),
  shared_with_user_id UUID REFERENCES auth.users(id),
  permission_level TEXT DEFAULT 'view', -- 'view', 'edit'
  shared_at TIMESTAMP DEFAULT NOW()
);
```

#### Frontend Components

```typescript
// Save button component
interface SaveButtonProps {
  place: PlaceResult;
  variant: 'icon' | 'button';
  className?: string;
}

// Share dialog component
interface ShareDialogProps {
  places: PlaceResult[];
  onShare: (shareData: ShareData) => void;
}

// User's saved places page
interface SavedPlacesProps {
  filters: SavedPlaceFilters;
  sortBy: 'date' | 'name' | 'location';
}
```

#### API Endpoints

```typescript
// Save/unsave places
POST /api/saves
DELETE /api/saves/:id
GET /api/saves?tags=spooky&location=nyc

// Share lists
POST /api/lists
GET /api/lists/:shareCode
PUT /api/lists/:id/collaborators
```

### 2. Speech Integration (Post-Mobile)

#### Voice Query Processing

```typescript
interface VoiceQuery {
  transcript: string;
  confidence: number;
  language: string;
  intent: 'search' | 'navigation' | 'save' | 'share';
}

// Voice processing pipeline
class VoiceProcessor {
  async processVoiceInput(audioBlob: Blob): Promise<VoiceQuery>;
  async generateVoiceResponse(text: string): Promise<AudioBuffer>;
  async enableContinuousListening(): Promise<void>;
}
```

#### Speech API Integration

- **Web Speech API**: Browser-native speech recognition
- **Google Cloud Speech-to-Text**: High accuracy, multiple languages
- **Text-to-Speech**: Audio responses for accessibility
- **Wake Word Detection**: "Hey Underfoot" activation

#### Accessibility Benefits

- **Vision Impaired**: Full voice navigation
- **Motor Disabilities**: Hands-free operation
- **Multilingual**: Support multiple languages
- **Driving Mode**: Safe voice-only interaction

### 3. Progressive Web App Features

#### Mobile Optimization

```typescript
// Service Worker for offline functionality
interface OfflineStrategy {
  cacheStrategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  maxAge: number;
  maxEntries: number;
}

// Push notifications for saved place updates
interface PlaceNotification {
  type: 'new_similar_place' | 'place_updated' | 'friend_shared';
  placeId: string;
  message: string;
  actionUrl: string;
}
```

#### Installation & Engagement

- **Add to Home Screen**: Native app-like experience
- **Push Notifications**: Updates about saved places
- **Offline Support**: Cached discoveries available offline
- **Location Services**: Background location for nearby suggestions

---

## 🎯 Implementation Priority

### Week 1: Foundation

1. ✅ Complete README update
2. 🎨 Implement Dream Horizon color scheme
3. 🔤 Set up Google Flavors + Inter font integration
4. 🧠 Basic semantic query expansion (static maps)

### Week 2: Intelligence

1. 🔍 Google Custom Search API integration
2. 🧠 Advanced semantic expansion with OpenAI embeddings
3. 🖼️ Google Vision API for image analysis
4. 💾 Basic save functionality

### Week 3: Deployment

1. 🚀 Production deployment to checkmarkdevtools.dev/underfoot
2. 📱 Progressive Web App features
3. 🔒 Security audit and performance optimization
4. 📊 Analytics and monitoring setup

### Future Releases

1. **v2.0**: Full share/save system with collaborative lists
2. **v2.1**: Speech integration and voice queries
3. **v2.2**: Advanced personalization and learning
4. **v3.0**: Social features and community recommendations

---

## 🔬 Research Citations

### Semantic Search

- TripAdvisor Engineering: "Building a semantic search engine for travel recommendations"
- Academic: "Query Expansion Using Word Embeddings" (ACM Digital Library)
- Haystack: "Advanced RAG: Query Expansion" techniques

### Typography & Design

- Figma Fonts: Google Flavors characteristics and design principles
- Accessibility Guidelines: WCAG 2.1 AA compliance for font pairing
- Font Pairing: Best practices for display + body font combinations

### Google APIs

- Google Developers: Knowledge Graph API documentation and use cases
- Google Cloud: Custom Search API implementation guides
- Google Cloud Vision: Image analysis capabilities for travel content

---

_🧠 Verdent AI: That one friend who actually reads the documentation and remembers it all. Seriously, how do you even store this much API knowledge?_
