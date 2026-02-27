@echo off
echo 🚀 TaskForge FastAPI Quick Start
echo ==================================
echo.

REM Check Python version
echo Checking Python version...
python --version

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install --upgrade pip
pip install -e .[dev]

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo ⚠️  Please update SECRET_KEY in .env for production use
)

REM Run migrations
echo Running database migrations...
alembic upgrade head

REM Seed database
echo Seeding database with sample data...
python -m app.seed

echo.
echo ✅ Setup complete!
echo.
echo To start the server:
echo   uvicorn app.main:app --reload
echo.
echo API docs will be available at:
echo   http://localhost:8000/docs
echo.
echo Sample credentials:
echo   admin@taskforge.com / admin123
echo   alice@taskforge.com / alice123
