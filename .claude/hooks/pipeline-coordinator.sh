#!/bin/bash
# .claude/hooks/pipeline-coordinator.sh
# Coordinates pipeline progression via queue file
# Run as a Stop hook inside each pipeline agent's frontmatter.
# Since it runs per-agent, we read the current in-progress stage from the queue.

set -e

input=$(cat)
queue_file=".tasks/pipeline-queue.json"

if [ ! -f "$queue_file" ]; then
  # No active pipeline
  exit 0
fi

current_agent=$(jq -r '.stages[] | select(.status == "in-progress") | .agent' "$queue_file")

echo "Pipeline stage completed: $current_agent"

# Update current stage to completed
jq --arg agent "$current_agent" '
  (.stages[] | select(.agent == $agent) | .status) = "completed" |
  .history += [{
    "stage": $agent,
    "completed_at": (now | todate)
  }]
' "$queue_file" > "$queue_file.tmp" && mv "$queue_file.tmp" "$queue_file"

# Find next stage
next_stage=$(jq -r '.stages[] | select(.status == "pending") | .name' "$queue_file" | head -n 1)

if [ -z "$next_stage" ]; then
  echo "✓ Pipeline complete!"
  jq '.current_stage = "complete"' "$queue_file" > "$queue_file.tmp" && mv "$queue_file.tmp" "$queue_file"
  exit 0
fi

# Mark next stage as in-progress
jq --arg stage "$next_stage" '
  (.stages[] | select(.name == $stage) | .status) = "in-progress" |
  .current_stage = $stage
' "$queue_file" > "$queue_file.tmp" && mv "$queue_file.tmp" "$queue_file"

next_agent=$(jq -r --arg stage "$next_stage" '.stages[] | select(.name == $stage) | .agent' "$queue_file")
next_input=$(jq -r --arg stage "$next_stage" '.stages[] | select(.name == $stage) | .input' "$queue_file")

echo ""
echo "▶ Next stage: $next_stage"
echo "▶ Agent: $next_agent"
echo "▶ Use the $next_agent subagent to read $next_input and proceed"
echo ""

exit 0