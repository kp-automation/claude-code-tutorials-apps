#!/bin/bash
# .claude/hooks/validate-spec.sh
# Validates that pm-spec agent created a complete spec file
# This is a Stop hook defined in the pm-spec agent's frontmatter,
# so it only runs when pm-spec finishes (no need to check agent name).

set -e

# Read hook input JSON from stdin
input=$(cat)
echo "Validating spec output..."

# Find the spec file (should be in .tasks/specs/)
spec_file=$(find .tasks/specs -name "*.md" -type f -mmin -5 | head -n 1)

if [ -z "$spec_file" ]; then
  echo "ERROR: No spec file found in .tasks/specs/" >&2
  echo "The pm-spec agent must create a spec file." >&2
  exit 2  # Exit 2 = block, stderr feedback sent to agent
fi

echo "Found spec: $spec_file"

# Check required sections
required_sections=("## Overview" "## User Stories" "## Acceptance Criteria" "## Technical Notes")

for section in "${required_sections[@]}"; do
  if ! grep -q "$section" "$spec_file"; then
    echo "ERROR: Missing required section: $section" >&2
    echo "The spec must include all required sections." >&2
    exit 2
  fi
done

# Check that Acceptance Criteria has actual criteria (not just the heading)
criteria_content=$(sed -n '/## Acceptance Criteria/,/^## /p' "$spec_file" | tail -n +2 | head -n -1)
if [ -z "$criteria_content" ] || [ $(echo "$criteria_content" | wc -w) -lt 10 ]; then
  echo "ERROR: Acceptance Criteria section is empty or too short" >&2
  echo "Please provide detailed, testable acceptance criteria." >&2
  exit 2
fi

echo "✓ Spec validation passed"
exit 0
