#!/usr/bin/env bash
# Local development setup script

set -e

echo "🐍 Setting up Underfoot Python Backend..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Python version: $PYTHON_VERSION"

# Install Poetry if not installed
if ! command -v poetry &> /dev/null; then
    echo "📦 Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "✅ Poetry installed: $(poetry --version)"

# Install dependencies
echo "📦 Installing project dependencies..."
poetry install

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API keys"
fi

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
poetry run pytest tests/unit/ -v

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys"
echo "2. Run 'poetry shell' to activate virtual environment"
echo "3. Run 'uvicorn src.workers.chat_worker:app --reload' to start dev server"
echo "4. Or run 'wrangler dev' for Cloudflare Workers local development"
