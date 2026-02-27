#!/bin/bash

echo "🚀 TaskForge FastAPI Quick Start"
echo "=================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -e ".[dev]"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update SECRET_KEY in .env for production use"
fi

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Seed database
echo "Seeding database with sample data..."
python -m app.seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  uvicorn app.main:app --reload"
echo ""
echo "Or use:"
echo "  make run"
echo ""
echo "API docs will be available at:"
echo "  http://localhost:8000/docs"
echo ""
echo "Sample credentials:"
echo "  admin@taskforge.com / admin123"
echo "  alice@taskforge.com / alice123"
