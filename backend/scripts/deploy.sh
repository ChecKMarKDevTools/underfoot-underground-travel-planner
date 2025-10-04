#!/usr/bin/env bash
# Deployment script for Cloudflare Workers

set -e

echo "🚀 Deploying Underfoot Python Backend to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare..."
    wrangler login
fi

# Run tests before deployment
echo "🧪 Running tests..."
poetry run pytest

# Run linting
echo "🔍 Running linting..."
poetry run ruff check .

# Export requirements for Cloudflare Workers
echo "📦 Exporting requirements..."
poetry export -f requirements.txt --output requirements.txt --without-hashes

# Deploy to Cloudflare
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your API is now live at:"
echo "https://underfoot-python-backend.your-account.workers.dev"
echo ""
echo "Don't forget to set secrets:"
echo "wrangler secret put OPENAI_API_KEY"
echo "wrangler secret put GEOAPIFY_API_KEY"
echo "wrangler secret put SERPAPI_KEY"
echo "wrangler secret put REDDIT_CLIENT_ID"
echo "wrangler secret put REDDIT_CLIENT_SECRET"
echo "wrangler secret put EVENTBRITE_TOKEN"
echo "wrangler secret put SUPABASE_URL"
echo "wrangler secret put SUPABASE_ANON_KEY"
echo "wrangler secret put SUPABASE_SERVICE_ROLE_KEY"
