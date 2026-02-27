#!/bin/bash

# TaskForge Setup Verification Script

echo "🔍 TaskForge Setup Verification"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Found $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} Found v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check if in correct directory
echo -n "Checking directory... "
if [ -f "package.json" ] && grep -q "taskforge" package.json; then
    echo -e "${GREEN}✓${NC} In correct directory"
else
    echo -e "${RED}✗${NC} Please run from taskforge/nextjs directory"
    exit 1
fi

# Check package.json
echo -n "Checking package.json... "
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} package.json not found"
    exit 1
fi

# Check if node_modules exists
echo -n "Checking node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed - run 'npm install'"
fi

# Check Prisma schema
echo -n "Checking Prisma schema... "
if [ -f "prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} Prisma schema not found"
    exit 1
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} Not found - copy from .env.example"
fi

# Check database
echo -n "Checking database... "
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✓${NC} Database exists"
else
    echo -e "${YELLOW}⚠${NC} Database not created - run 'npx prisma db push'"
fi

# Check TypeScript config
echo -n "Checking tsconfig.json... "
if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} TypeScript config not found"
    exit 1
fi

# Check Tailwind config
echo -n "Checking Tailwind config... "
if [ -f "tailwind.config.ts" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} Tailwind config not found"
    exit 1
fi

# Check key directories
echo -n "Checking app directory... "
if [ -d "app" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} app directory not found"
    exit 1
fi

echo -n "Checking components... "
if [ -d "components" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} components directory not found"
    exit 1
fi

echo -n "Checking lib directory... "
if [ -d "lib" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} lib directory not found"
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}Setup verification complete!${NC}"
echo ""

# Suggest next steps
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run: npm install"
    echo "2. Run: npx prisma db push"
    echo "3. Run: npm run seed"
    echo "4. Run: npm run dev"
elif [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run: npx prisma db push"
    echo "2. Run: npm run seed"
    echo "3. Run: npm run dev"
else
    echo -e "${GREEN}Ready to start!${NC}"
    echo "Run: npm run dev"
fi

echo ""
