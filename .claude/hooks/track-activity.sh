#!/usr/bin/env bash
# PostToolUse hook — records every tool call to .claude/logs/activity.log
#
# Captures timestamp, session prefix, tool name, success/failure, and a
# brief description of what was touched. Useful for reconstructing what
# happened during a Ralph run or any other agent session.
#
# Log format (one line per tool call):
#   [YYYY-MM-DDTHH:MM:SSZ] [SESSION] TOOL  ok|err  description
#
# Always exits 0 — never modifies tool output or blocks execution.

set -euo pipefail

# ── Dependencies ──────────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  exit 0
fi

# ── Constants ─────────────────────────────────────────────────────────────────
ACTIVITY_LOG=".claude/logs/activity.log"
MAX_SUMMARY_LEN=120

mkdir -p "$(dirname "$ACTIVITY_LOG")"

# ── Parse hook input ──────────────────────────────────────────────────────────
EVENT=$(cat)
TOOL=$(echo "$EVENT"     | jq -r '.tool_name          // ""')
SESSION=$(echo "$EVENT"  | jq -r '.session_id         // ""' | cut -c1-8)
IS_ERROR=$(echo "$EVENT" | jq -r '.tool_response.is_error // false')
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

STATUS="ok"
[[ "$IS_ERROR" == "true" ]] && STATUS="err"

# ── Build summary description per tool type ───────────────────────────────────
summary() {
  local desc="$1"
  # Truncate to MAX_SUMMARY_LEN, collapse internal whitespace
  echo "$desc" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-"$MAX_SUMMARY_LEN"
}

case "$TOOL" in

  Bash)
    CMD=$(echo "$EVENT" | jq -r '.tool_input.command // ""')
    # Collapse multi-line commands and truncate
    DESC=$(summary "$CMD")
    ;;

  Write)
    FILE=$(echo "$EVENT" | jq -r '.tool_input.file_path // ""')
    # Show path relative to project root if possible
    REL="${FILE#*/taskforge/}"
    DESC="write $REL"
    ;;

  Edit)
    FILE=$(echo "$EVENT" | jq -r '.tool_input.file_path // ""')
    REL="${FILE#*/taskforge/}"
    OLD=$(echo "$EVENT"  | jq -r '.tool_input.old_string // ""' | head -c 40 | tr '\n' ' ')
    DESC="edit $REL  ← \"${OLD}…\""
    ;;

  Read)
    FILE=$(echo "$EVENT" | jq -r '.tool_input.file_path // ""')
    REL="${FILE#*/taskforge/}"
    OFFSET=$(echo "$EVENT" | jq -r '.tool_input.offset // ""')
    DESC="read $REL${OFFSET:+ @L$OFFSET}"
    ;;

  Glob)
    PATTERN=$(echo "$EVENT" | jq -r '.tool_input.pattern // ""')
    DESC="glob \"$PATTERN\""
    ;;

  Grep)
    QUERY=$(echo "$EVENT" | jq -r '.tool_input.query // .tool_input.pattern // ""')
    PATH_HINT=$(echo "$EVENT" | jq -r '.tool_input.path // ""' | sed "s|.*/taskforge/||")
    DESC="grep \"$QUERY\"${PATH_HINT:+ in $PATH_HINT}"
    ;;

  Agent)
    AGENT_DESC=$(echo "$EVENT" | jq -r '.tool_input.description // ""' | head -c 60)
    DESC="spawn agent: $AGENT_DESC"
    ;;

  *)
    DESC="(no summary)"
    ;;

esac

# ── Emit log line ─────────────────────────────────────────────────────────────
printf '[%s] [%s] %-6s %s  %s\n' \
  "$TS" "${SESSION:-????????}" "$TOOL" "$STATUS" "$(summary "$DESC")" >> "$ACTIVITY_LOG"

# ── Periodic stats snapshot (every ~50 tool calls) ───────────────────────────
# Keeps a rolling count so the dashboard has quick summary numbers.
LINE_COUNT=$(wc -l < "$ACTIVITY_LOG" 2>/dev/null || echo 0)

if (( LINE_COUNT % 50 == 0 && LINE_COUNT > 0 )); then
  STATS_FILE=".claude/logs/ralph-stats.json"
  COMPLETED=$(ls .tasks/completed/ 2>/dev/null | wc -l | tr -d ' ')
  BLOCKED=$(ls .tasks/blocked/    2>/dev/null | wc -l | tr -d ' ')
  QUEUED=$(ls .tasks/queue/       2>/dev/null | wc -l | tr -d ' ')
  IN_PROG=$(ls .tasks/in-progress/ 2>/dev/null | grep -v handoff | wc -l | tr -d ' ')
  ERRORS=$(grep -c ' err ' "$ACTIVITY_LOG" 2>/dev/null || echo 0)

  printf '{"ts":"%s","queue":%s,"in_progress":%s,"completed":%s,"blocked":%s,"total_tool_calls":%s,"tool_errors":%s}\n' \
    "$TS" "$QUEUED" "$IN_PROG" "$COMPLETED" "$BLOCKED" "$LINE_COUNT" "$ERRORS" \
    > "$STATS_FILE"
fi

exit 0
