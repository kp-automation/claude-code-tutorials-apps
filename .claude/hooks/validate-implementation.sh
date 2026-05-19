#!/bin/bash
# .claude/hooks/validate-implementation.sh
# Validates that implementer-tester agent wrote code that passes tests
# This is a Stop hook defined in the implementer-tester agent's frontmatter.

set -e

input=$(cat)

echo "Validating implementation..."

# Run lint
echo "Running lint..."
if ! npm run lint; then
  echo "ERROR: Lint failed" >&2
  echo "Please fix all linting errors before completing." >&2
  exit 2  # Exit 2 = block, feedback sent to agent via stderr
fi

# Run tests
echo "Running tests..."
if ! npm test -- --passWithNoTests; then
  echo "ERROR: Tests failed" >&2
  echo "All tests must pass before implementation is complete." >&2
  exit 2
fi

# Check test coverage (optional but recommended)
echo "Checking test coverage..."
if ! npm test -- --coverage --coverageThreshold='{"global":{"statements":70}}' > /dev/null 2>&1; then
  echo "WARNING: Test coverage below 70%" >&2
  echo "Consider adding more tests, but allowing to proceed." >&2
fi

echo "✓ Implementation validation passed"
exit 0
