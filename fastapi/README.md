# TaskForge FastAPI

A complete project management API built with FastAPI, SQLAlchemy, and SQLite.

## Features

- User authentication with JWT tokens
- Project management (CRUD operations)
- Task management with status and priority
- Comments on tasks
- Labels for tasks
- Role-based access (ADMIN, MEMBER, VIEWER)
- RESTful API design
- Auto-generated OpenAPI documentation

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy 2.0** - ORM for database operations
- **Alembic** - Database migrations
- **SQLite** - Lightweight database
- **Pydantic v2** - Data validation and settings
- **python-jose** - JWT token handling
- **passlib** - Password hashing
- **pytest** - Testing framework

## Setup

### Prerequisites

- Python 3.12+
- pip

### Installation

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -e .
```

For development dependencies:

```bash
pip install -e ".[dev]"
```

3. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and update the `SECRET_KEY` for production.

### Database Setup

Run database migrations:

```bash
alembic upgrade head
```

### Seed Data

Populate the database with sample data:

```bash
python -m app.seed
```

Sample credentials:
- `admin@taskforge.com` / `admin123` (ADMIN)
- `alice@taskforge.com` / `alice123` (MEMBER)
- `bob@taskforge.com` / `bob123` (MEMBER)
- `viewer@taskforge.com` / `viewer123` (VIEWER)

## Running the Application

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update a project
- `DELETE /api/projects/{id}` - Delete a project
- `GET /api/projects/{id}/labels` - Get project labels
- `POST /api/projects/{id}/labels` - Create a label

### Tasks
- `GET /api/tasks` - List all tasks (filter by `?project_id=X`)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

### Comments
- `GET /api/tasks/{id}/comments` - Get task comments
- `POST /api/tasks/{id}/comments` - Add a comment to a task

## Testing

Run the test suite:

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=app --cov-report=html
```

## Project Structure

```
fastapi/
├── app/
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── routers/         # API route handlers
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions (auth, exceptions)
│   ├── config.py        # Application configuration
│   ├── database.py      # Database setup
│   ├── main.py          # FastAPI application
│   └── seed.py          # Database seeding script
├── alembic/             # Database migrations
├── tests/               # Test suite
├── pyproject.toml       # Project dependencies
├── alembic.ini          # Alembic configuration
└── .env.example         # Environment variables template
```

## Development Notes

This project intentionally includes some imperfections for teaching purposes:

1. **Inconsistent error handling** - Some routes use service layer, others have inline logic
2. **Mixed query styles** - Some use ORM, others use raw SQL
3. **Sparse documentation** - Some functions lack comprehensive docstrings
4. **Incomplete tests** - Test suite has gaps (delete operations, edge cases)
5. **Missing validations** - Some endpoints have minimal validation

These are intentional to provide learning opportunities for code improvement.

## License

MIT
