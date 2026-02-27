# TaskForge - Project Management Application

A modern project management application built with Next.js 15, TypeScript, Prisma, and Tailwind CSS.

## Features

- **Authentication**: Secure login/register with NextAuth.js
- **Dashboard**: Overview of tasks and projects with statistics
- **Projects**: Create, manage, and archive projects
- **Kanban Board**: Visual task management with three columns (To Do, In Progress, Done)
- **Task Management**: Create, update, delete, and assign tasks
- **Comments**: Threaded comments on tasks
- **Labels**: Create and assign colored labels to tasks
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT
- **Dark Mode**: Full dark mode support

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui components
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository and navigate to the project:

```bash
cd taskforge/nextjs
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and update the following:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. Initialize the database:

```bash
npx prisma db push
```

5. Seed the database with sample data:

```bash
npm run seed
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Sample Credentials

After seeding, you can login with:

- **Email**: alice@example.com
- **Password**: password123

Other test accounts:
- bob@example.com / password123
- charlie@example.com / password123

## Project Structure

```
nextjs/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   ├── projects/            # Project pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Dashboard
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── task-card.tsx
│   ├── task-board.tsx
│   ├── project-list.tsx
│   └── comment-thread.tsx
├── lib/                     # Utilities and configurations
│   ├── db.ts                # Prisma client
│   ├── auth.ts              # NextAuth config
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma
│   └── seed.ts
└── tests/                   # Test files
```

## Database Schema

- **User**: Authentication and user management
- **Project**: Project organization
- **Task**: Task tracking with status and priority
- **Comment**: Task comments
- **Label**: Custom labels for tasks
- **TaskLabel**: Many-to-many relationship

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Testing

Run tests with:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Intentional Imperfections (For Learning)

This project intentionally includes some imperfections for educational purposes:

1. **Inconsistent error handling** - Some API routes use try/catch, others don't
2. **Duplicated fetch logic** - Components fetch data directly instead of using a shared API client
3. **Missing tests** - Some endpoints and components lack comprehensive test coverage
4. **Sparse comments** - Limited code documentation in some areas
5. **Mixed styling** - Some inline styles mixed with Tailwind classes

## License

MIT
