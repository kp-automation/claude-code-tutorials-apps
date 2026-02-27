# TaskForge Setup Instructions

## Prerequisites

Ensure you have the following installed:
- Node.js 18 or higher
- npm (comes with Node.js)

## Installation Steps

### 1. Navigate to the project directory

```bash
cd /Users/anderson/Documents/lumenalta/claude-code-tutorials/taskforge/nextjs
```

### 2. Install dependencies

```bash
npm install
```

If you encounter peer dependency issues, try:

```bash
npm install --legacy-peer-deps
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Initialize the database

```bash
npx prisma db push
```

This will create the SQLite database file at `prisma/dev.db`.

### 5. Seed the database

```bash
npm run seed
```

This creates sample users, projects, and tasks.

### 6. Start the development server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Sample Login Credentials

After seeding, you can login with:

**Admin User:**
- Email: `alice@example.com`
- Password: `password123`

**Member Users:**
- Email: `bob@example.com` | Password: `password123`
- Email: `charlie@example.com` | Password: `password123`

## Troubleshooting

### Database Issues

If you encounter database errors:

```bash
# Reset the database
rm prisma/dev.db
npx prisma db push
npm run seed
```

### Dependencies Issues

If npm install fails:

1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules package-lock.json`
3. Reinstall: `npm install --legacy-peer-deps`

### Port Already in Use

If port 3000 is taken:

```bash
# Run on different port
PORT=3001 npm run dev
```

## Verifying Installation

After starting the dev server, verify:

1. ✅ Login page loads at `/auth/login`
2. ✅ Can login with sample credentials
3. ✅ Dashboard shows stats and recent activity
4. ✅ Can navigate to Projects page
5. ✅ Can create a new project
6. ✅ Can view project and see Kanban board
7. ✅ Can create tasks
8. ✅ Can click task to view details
9. ✅ Can add comments to tasks
10. ✅ Can change task status and priority

## Database Management

### View Database

Use Prisma Studio to view/edit data:

```bash
npx prisma studio
```

Opens at [http://localhost:5555](http://localhost:5555)

### Reset Database

```bash
rm prisma/dev.db
npx prisma db push
npm run seed
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Building for Production

```bash
npm run build
npm start
```

## Environment Variables

The `.env` file contains:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="taskforge-secret-key-change-in-production-12345"
NODE_ENV="development"
```

⚠️ **Important:** Change `NEXTAUTH_SECRET` before deploying to production!

## Next Steps

1. Explore the codebase to find intentional imperfections
2. Add features like:
   - User profile management
   - Task assignment to multiple users
   - File attachments
   - Activity timeline
   - Email notifications
3. Improve error handling
4. Add comprehensive tests
5. Implement real-time updates with WebSockets

## Support

For issues, check:
- README.md for project overview
- Code comments for implementation details
- Prisma schema for data model
