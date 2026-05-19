#!/bin/bash
# .claude/hooks/enforce-path-restrictions.sh
# Enforces file path restrictions for subagents via PreToolUse hook.
# Define this as a PreToolUse hook in the agent's frontmatter.
# Uses tool_input.file_path from the hook JSON input.

set -e

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0  # No file path, nothing to check
fi

# Define allowed path patterns (customize per agent)
# These could also be loaded from a config file
ALLOWED_PATTERNS=(
  "src/**"
  "tests/**"
  "package.json"
  "tsconfig.json"
)

# Block sensitive paths
BLOCKED_PATTERNS=(
  ".env"
  ".env.*"
  "secrets/**"
)

# Check blocked patterns first
for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if [[ "$file_path" == $pattern ]]; then
    echo "Blocked: access to $file_path is not allowed" >&2
    exit 2  # Exit 2 = block the tool call
  fi
done

# Check if file_path matches any allowed pattern
shopt -s globstar nullglob
allowed=false
for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if [[ "$file_path" == $pattern ]]; then
    allowed=true
    break
  fi
done

if [ "$allowed" = false ]; then
  echo "Permission denied: $file_path is not in the allowed paths" >&2
  exit 2
fi

exit 0