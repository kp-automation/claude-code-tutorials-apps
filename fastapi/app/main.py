from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, projects, tasks, comments

app = FastAPI(
    title="TaskForge API",
    description="Project management API built with FastAPI",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(comments.router)


@app.get("/")
def root():
    return {"message": "TaskForge API", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
