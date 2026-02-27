# CLAUDE.md

> This file provides context for Claude Code when working with this repository.
> **Tutorial 2** will guide you through expanding and improving this file.

## Project Overview

TaskForge is a project management application with two implementations:
- `nextjs/` — Next.js 15 full-stack app
- `fastapi/` — Python FastAPI backend

## Quick Commands

```bash
# Next.js
cd nextjs && npm run dev

# FastAPI
cd fastapi && uvicorn app.main:app --reload
```

## Tech Stack

### Next.js Track
- Next.js 15 (App Router)
- TypeScript
- Prisma + SQLite
- Tailwind CSS + shadcn/ui
- NextAuth.js

### FastAPI Track
- Python 3.12+
- FastAPI + Uvicorn
- SQLAlchemy 2.0 + Alembic
- Pydantic v2
- JWT authentication

## Data Model

Both tracks share the same entities:
- User (email, password, name, role)
- Project (name, description, status, owner)
- Task (title, description, status, priority, assignee)
- Comment (content, author, task)
- Label (name, color, project)

---

> **Note:** This CLAUDE.md is intentionally minimal. In Tutorial 2, you'll learn how to expand it with architecture details, coding conventions, common commands, and more.
