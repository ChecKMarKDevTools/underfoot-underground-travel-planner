# Quick Start Guide - Python Backend

## 🚀 Setup (5 minutes)

### 1. Prerequisites Check
```bash
python3 --version  # Should be 3.11+
```

### 2. Install Dependencies
```bash
cd backend-python
pip install poetry
poetry install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Run Development Server
```bash
# Option 1: FastAPI dev server (recommended for development)
poetry run uvicorn src.workers.chat_worker:app --reload --port 8000

# Option 2: Wrangler local (Cloudflare Workers simulation)
wrangler dev
```

## 📍 API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Search
```bash
curl -X POST http://localhost:8000/underfoot/search \
  -H "Content-Type: application/json" \
  -d '{"chat_input": "hidden gems in Pikeville KY"}'
```

## 🧪 Run Tests
```bash
# All tests with coverage
poetry run pytest

# Specific test file
poetry run pytest tests/unit/test_services/test_openai_service.py

# With verbose output
poetry run pytest -v
```

## 🚢 Deploy to Cloudflare

### One-time Setup
```bash
npm install -g wrangler
wrangler login
```

### Set Secrets
```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put GEOAPIFY_API_KEY
wrangler secret put SERPAPI_KEY
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put EVENTBRITE_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Deploy
```bash
# Run deployment script
./scripts/deploy.sh

# Or manually
poetry export -f requirements.txt --output requirements.txt --without-hashes
wrangler deploy
```

## 🔧 Development Commands

```bash
# Lint code
poetry run ruff check .

# Format code
poetry run black .

# Type check
poetry run mypy src/

# Security scan
poetry run bandit -r src/
```

## 📊 Code Quality Targets

- Test Coverage: >85%
- Type Coverage: 100%
- Security Score: A+
- Linting: 0 errors

## 🐛 Troubleshooting

### Import Errors
```bash
# Make sure you're in the poetry shell
poetry shell
```

### Missing Dependencies
```bash
poetry install --sync
```

### Wrangler Issues
```bash
wrangler logout
wrangler login
```

## 📚 Next Steps

1. ✅ Review `AGENTS.md` for development guidelines
2. ✅ Check `README.md` for architecture details  
3. ✅ Review `docs/PYTHON_BACKEND_MIGRATION_PLAN.md` for full migration strategy
4. ✅ Start implementing additional services as needed

---

**Happy coding! 🐍**
