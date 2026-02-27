# TaskForge FastAPI - Implementation Notes

## Overview

This is a complete FastAPI implementation of the TaskForge project management system. It provides a RESTful API with authentication, project management, task tracking, comments, and labels.

## Architecture

### Models (SQLAlchemy 2.0)

All models use the new SQLAlchemy 2.0 `Mapped` type annotations for better type checking.

#### User Model
- Fields: id, email, password_hash, name, role, created_at, updated_at
- Roles: ADMIN, MEMBER, VIEWER
- Relationships: owned_projects, assigned_tasks, comments

#### Project Model
- Fields: id, name, description, status, owner_id, created_at, updated_at
- Status: ACTIVE, ARCHIVED
- Relationships: owner, tasks, labels

#### Task Model
- Fields: id, title, description, status, priority, project_id, assignee_id, created_at, updated_at
- Status: TODO, IN_PROGRESS, DONE
- Priority: LOW, MEDIUM, HIGH, URGENT
- Relationships: project, assignee, comments, labels (many-to-many)

#### Comment Model
- Fields: id, content, task_id, author_id, created_at, updated_at
- Relationships: task, author

#### Label Model
- Fields: id, name, color, project_id
- Relationships: project, tasks (many-to-many)
- Association table: TaskLabel

### Schemas (Pydantic v2)

All schemas use Pydantic v2 with `model_config` for configuration:
- Base schemas for shared fields
- Create schemas for POST requests
- Update schemas with optional fields
- Response schemas with `from_attributes=True` for ORM conversion

### Authentication

- JWT tokens using python-jose
- Bcrypt password hashing with passlib
- OAuth2 password bearer flow
- Token expiration configurable via settings
- Current user dependency injection

### API Structure

#### Authentication Router (`/api/auth`)
- POST `/register` - User registration
- POST `/login` - Login with JWT token
- GET `/me` - Get current user info

#### Projects Router (`/api/projects`)
- GET `` - List user's projects
- POST `` - Create project
- GET `/{id}` - Get project details
- PUT `/{id}` - Update project
- DELETE `/{id}` - Delete project
- GET `/{id}/labels` - Get project labels
- POST `/{id}/labels` - Create label

#### Tasks Router (`/api/tasks`)
- GET `` - List tasks (optional ?project_id filter)
- POST `` - Create task
- GET `/{id}` - Get task details
- PUT `/{id}` - Update task
- DELETE `/{id}` - Delete task

#### Comments Router (`/api/tasks/{id}/comments`)
- GET `` - Get task comments
- POST `` - Add comment to task

### Service Layer

The service layer handles business logic and data access:

- `auth_service.py` - User registration, authentication, token generation
- `project_service.py` - Project CRUD operations with ownership checks
- `task_service.py` - Task CRUD operations with project access validation

### Database

- SQLite for simplicity (easily swappable for PostgreSQL/MySQL)
- Alembic for migrations
- Session management with dependency injection
- Automatic table creation via migrations

### Configuration

Using pydantic-settings for environment-based configuration:
- Database URL
- JWT secret key and algorithm
- Token expiration time
- Debug mode
- CORS origins

## Intentional Imperfections

These were included for teaching purposes:

### 1. Inconsistent Error Handling
- Projects router uses service layer consistently
- Comments router has mixed inline logic and service calls
- Labels endpoints have minimal validation

**Location**: `app/routers/projects.py` (lines 68-92)
- `get_project_labels` uses inline query instead of service
- `create_project_label` skips proper ownership verification

### 2. Mixed Query Styles
**Location**: `app/routers/comments.py`
- `get_task_comments` uses both ORM query() and scalars(select())
- Inconsistent with rest of codebase that primarily uses query()

### 3. Sparse Documentation
**Location**: Various service functions
- Some functions have comprehensive docstrings
- Others have minimal or no documentation
- Example: `app/services/task_service.py` has good docs, but some router handlers don't

### 4. Missing Tests
**Location**: `tests/` directory
- test_projects.py missing: delete test, unauthorized access, invalid IDs
- test_tasks.py missing: update test, delete test, assignee handling
- test_auth.py missing: duplicate email, invalid credentials
- No tests for comments or labels endpoints at all

### 5. Minimal Validation
**Location**: `app/routers/projects.py` (create_project_label)
- Doesn't verify project ownership before creating label
- Could allow creating labels on other users' projects

## Data Model Consistency

The FastAPI models match the Next.js track structure exactly:

| Model | FastAPI | Next.js | Match |
|-------|---------|---------|-------|
| User | ✅ | ✅ | ✅ |
| Project | ✅ | ✅ | ✅ |
| Task | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| Label | ✅ | ✅ | ✅ |
| TaskLabel | ✅ | ✅ | ✅ |

All enum values (roles, statuses, priorities) are identical between implementations.

## JSON Response Format

API responses match the expected Next.js format:

```json
{
  "id": 1,
  "name": "Project Name",
  "description": "Description",
  "status": "ACTIVE",
  "owner_id": 1,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

Dates are serialized as ISO 8601 strings (handled automatically by Pydantic).

## Testing

The test suite uses:
- pytest for test running
- pytest-asyncio for async support
- httpx TestClient for API testing
- In-memory SQLite for test isolation
- Fixtures for common setup (db, client, auth_headers)

Test coverage is intentionally incomplete (~60%) to provide learning opportunities.

## Seed Data

The seed script creates:
- 4 users (admin, 2 members, 1 viewer)
- 4 projects (3 active, 1 archived)
- 7 tasks across projects with various statuses
- 5 comments on tasks
- 5 labels with color codes
- Task-label associations

All passwords are hashed using bcrypt.

## Running the Application

### Quick Start
```bash
chmod +x quickstart.sh
./quickstart.sh
```

### Manual Setup
```bash
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

### Using Makefile
```bash
make dev        # Install dev dependencies
make migrate    # Run migrations
make seed       # Seed database
make run        # Start server
make test       # Run tests
make test-cov   # Run tests with coverage
```

## API Documentation

FastAPI auto-generates interactive documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Security Features

- Password hashing with bcrypt (configurable rounds)
- JWT tokens with expiration
- Protected routes using dependency injection
- CORS middleware for frontend integration
- SQL injection protection via ORM
- Input validation via Pydantic

## Performance Considerations

- Database connection pooling via SQLAlchemy
- Efficient relationship loading
- Indexed fields on users.email, primary keys
- Lightweight SQLite for development
- Can scale to PostgreSQL/MySQL for production

## Deployment Notes

For production deployment:
1. Change SECRET_KEY to a cryptographically secure random value
2. Switch to PostgreSQL or MySQL
3. Set DEBUG=False
4. Configure proper CORS origins
5. Use a production ASGI server (uvicorn with workers)
6. Add rate limiting
7. Implement proper logging
8. Add monitoring and health checks

## Extension Points

Easy areas to extend:
1. Add file attachments to tasks
2. Implement real-time notifications (WebSockets)
3. Add email notifications
4. Implement task dependencies
5. Add time tracking
6. Create API versioning
7. Add search functionality
8. Implement pagination
9. Add audit logging
10. Create admin dashboard endpoints

## Learning Opportunities

Students can improve this codebase by:
1. Fixing inconsistent error handling patterns
2. Standardizing query styles throughout
3. Adding comprehensive test coverage
4. Implementing missing validations
5. Adding detailed docstrings
6. Implementing pagination
7. Adding filtering and sorting options
8. Creating more granular permissions
9. Adding rate limiting
10. Implementing caching strategies
