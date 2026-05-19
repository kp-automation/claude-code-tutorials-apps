#!/bin/bash
# .claude/hooks/human-gate-review.sh
# Human gate after architect review
# This is a Stop hook in the architect-review agent's frontmatter.

set -e

input=$(cat)

review_file=$(find .tasks/reviews -name "*-review.md" -type f -mmin -5 | head -n 1)

if [ ! -f "$review_file" ]; then
  echo "ERROR: Review file not found" >&2
  exit 2  # Block — agent must create a review file
fi

decision=$(grep -E "^Decision: (APPROVED|REJECTED)" "$review_file" | awk '{print $2}')

if [ "$decision" == "REJECTED" ]; then
  echo "❌ Architect rejected the design." >&2
  echo "Review feedback in $review_file and revise the spec." >&2
  exit 2  # Block — agent should address rejection
fi

if [ "$decision" == "APPROVED" ]; then
  # Approved — allow the agent to stop, print next steps to stdout
  # Stdout text is added to context on exit 0
  echo "✓ Architect approved the design."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  HUMAN GATE: Review the approval before proceeding"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "The architect has approved the design. Review:"
  echo "  - Spec: .tasks/specs/[feature].md"
  echo "  - Review: $review_file"
  echo ""
  echo "To proceed to implementation:"
  echo "  Use the implementer-tester subagent to read .tasks/specs/[feature].md and implement"
  echo ""
  echo "To reject and revise:"
  echo "  Edit the spec then use the architect-review subagent again"
  echo ""
  exit 0  # Allow the agent to stop — human reviews printed output
fi

echo "ERROR: Review decision unclear" >&2
exit 2
