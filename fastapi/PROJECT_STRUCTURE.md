# TaskForge FastAPI - Project Structure

```
fastapi/
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── alembic.ini                     # Alembic migration configuration
├── pyproject.toml                  # Project dependencies and metadata
├── requirements.txt                # Pip requirements file
├── Makefile                        # Build automation commands
├── quickstart.sh                   # Quick setup script (Linux/Mac)
├── quickstart.bat                  # Quick setup script (Windows)
├── README.md                       # Main documentation
├── IMPLEMENTATION_NOTES.md         # Detailed implementation guide
│
├── alembic/                        # Database migrations
│   ├── env.py                      # Alembic environment configuration
│   ├── script.py.mako              # Migration template
│   └── versions/
│       └── 001_initial.py          # Initial database schema migration
│
├── app/                            # Main application package
│   ├── __init__.py
│   ├── main.py                     # FastAPI application entry point
│   ├── config.py                   # Application configuration (pydantic-settings)
│   ├── database.py                 # SQLAlchemy database setup
│   ├── seed.py                     # Database seeding script
│   │
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py                 # User model (id, email, password_hash, name, role)
│   │   ├── project.py              # Project model (id, name, description, status, owner_id)
│   │   ├── task.py                 # Task model (id, title, status, priority, project_id, assignee_id)
│   │   ├── comment.py              # Comment model (id, content, task_id, author_id)
│   │   └── label.py                # Label model + TaskLabel association table
│   │
│   ├── schemas/                    # Pydantic schemas for validation
│   │   ├── __init__.py
│   │   ├── user.py                 # User, UserCreate, UserLogin, Token schemas
│   │   ├── project.py              # Project, ProjectCreate, ProjectUpdate schemas
│   │   ├── task.py                 # Task, TaskCreate, TaskUpdate schemas
│   │   ├── comment.py              # Comment, CommentCreate schemas
│   │   └── label.py                # Label, LabelCreate schemas
│   │
│   ├── routers/                    # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py                 # POST /api/auth/register, /login, GET /me
│   │   ├── projects.py             # CRUD /api/projects, /projects/{id}/labels
│   │   ├── tasks.py                # CRUD /api/tasks with project_id filtering
│   │   └── comments.py             # GET/POST /api/tasks/{id}/comments
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py         # User authentication & token generation
│   │   ├── project_service.py      # Project CRUD with ownership checks
│   │   └── task_service.py         # Task CRUD with access validation
│   │
│   └── utils/                      # Utility functions
│       ├── __init__.py
│       ├── security.py             # JWT, password hashing, get_current_user
│       └── exceptions.py           # Custom exception classes
│
└── tests/                          # Test suite (pytest)
    ├── __init__.py
    ├── conftest.py                 # Test fixtures (db, client, auth_headers)
    ├── test_auth.py                # Authentication endpoint tests
    ├── test_projects.py            # Project CRUD tests (intentionally incomplete)
    └── test_tasks.py               # Task CRUD tests (intentionally incomplete)
```

## File Counts

- **Python files**: 36
- **Configuration files**: 7
- **Documentation files**: 3
- **Total lines of code**: ~2,500+

## Key Components

### Database Models (6 tables)
1. **users** - User accounts with role-based access
2. **projects** - Project containers
3. **tasks** - Work items with status and priority
4. **comments** - Task discussions
5. **labels** - Task categorization
6. **task_labels** - Many-to-many task-label associations

### API Endpoints (16 routes)
1. Auth: 3 endpoints (register, login, me)
2. Projects: 7 endpoints (CRUD + labels)
3. Tasks: 5 endpoints (CRUD)
4. Comments: 2 endpoints (list, create)

### Service Functions (11 methods)
- Auth: register_user, authenticate_user, generate_token
- Projects: get_projects, get_project, create_project, update_project, delete_project
- Tasks: get_tasks, get_task, create_task, update_task, delete_task

### Test Cases (11 tests)
- Auth: 3 tests (register, login, get_me)
- Projects: 4 tests (create, list, get, update)
- Tasks: 4 tests (create, list, list_by_project, get)

## Dependencies

### Core
- fastapi - Web framework
- uvicorn - ASGI server
- sqlalchemy - ORM
- alembic - Migrations
- pydantic - Validation
- pydantic-settings - Configuration

### Security
- python-jose - JWT tokens
- passlib - Password hashing
- python-multipart - Form data

### Testing
- pytest - Test framework
- pytest-asyncio - Async testing
- pytest-cov - Coverage reports
- httpx - HTTP client for tests

## Quick Commands

```bash
# Setup
make dev                # Install all dependencies
make migrate            # Run database migrations
make seed               # Populate sample data

# Development
make run                # Start development server
make test               # Run test suite
make test-cov           # Run tests with coverage
make clean              # Clean build artifacts

# Manual
uvicorn app.main:app --reload        # Start server
python -m app.seed                    # Seed database
pytest -v                             # Run tests
alembic upgrade head                  # Run migrations
```

## Environment Variables

Required in `.env` file:

```env
DATABASE_URL=sqlite:///./taskforge.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Sample Data

When seeded, the database contains:
- 4 users (1 admin, 2 members, 1 viewer)
- 4 projects (3 active, 1 archived)
- 7 tasks (various statuses and priorities)
- 5 comments
- 5 labels
- Task-label associations

## API Response Format

All responses follow consistent JSON structure:

```json
{
  "id": 1,
  "name": "Project Name",
  "status": "ACTIVE",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

## Features

✅ User authentication with JWT
✅ Password hashing with bcrypt
✅ Role-based access control
✅ Project ownership validation
✅ Task assignment and tracking
✅ Comments on tasks
✅ Task labels with colors
✅ Database migrations
✅ Seed data script
✅ Automated tests
✅ Auto-generated API docs
✅ CORS support
✅ Type hints throughout
✅ Pydantic validation

## Intentional Gaps (Teaching Opportunities)

🔧 Inconsistent error handling patterns
🔧 Mixed ORM query styles
🔧 Sparse docstrings in some areas
🔧 Incomplete test coverage (~60%)
🔧 Missing validation on some endpoints
🔧 No pagination implementation
🔧 No rate limiting
🔧 No caching layer

These gaps provide learning opportunities for code improvement exercises.
