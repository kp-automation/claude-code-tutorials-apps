#!/usr/bin/env bash
# PostToolUse hook — logs Ralph agent phase transitions to .claude/logs/ralph.log
#
# Fires on Bash, Write, and Edit tool calls. Detects Ralph-specific patterns
# and emits structured log lines and JSON events. Always exits 0 — never blocks.
#
# Log format:
#   [YYYY-MM-DDTHH:MM:SSZ] [ralph] [TASK:NNN] PHASE    → message
#
# Event format (.claude/logs/ralph-events.jsonl):
#   {"ts":"...","agent":"ralph","event":"task_completed","task":"001","session":"abc12345"}

set -euo pipefail

# ── Dependencies ──────────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  exit 0  # jq unavailable — skip silently rather than error
fi

# ── Constants ─────────────────────────────────────────────────────────────────
LOG_FILE=".claude/logs/ralph.log"
EVENTS_FILE=".claude/logs/ralph-events.jsonl"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$(dirname "$LOG_FILE")"

# ── Parse hook input ──────────────────────────────────────────────────────────
EVENT=$(cat)
TOOL=$(echo "$EVENT"     | jq -r '.tool_name       // ""')
CMD=$(echo "$EVENT"      | jq -r '.tool_input.command   // ""')
FILE_PATH=$(echo "$EVENT" | jq -r '.tool_input.file_path // ""')
SESSION=$(echo "$EVENT"  | jq -r '.session_id       // ""' | cut -c1-8)
IS_ERROR=$(echo "$EVENT" | jq -r '.tool_response.is_error // false')

# ── Helpers ───────────────────────────────────────────────────────────────────

# Detect which task is currently in-progress from the .tasks directory
current_task_id() {
  ls .tasks/in-progress/ 2>/dev/null \
    | grep -v '\-handoff' \
    | head -1 \
    | grep -oE '^[0-9]+' \
    || echo "???"
}

TASK_ID=$(current_task_id)

log_phase() {
  local phase="$1" msg="$2"
  printf '[%s] [ralph] [TASK:%s] %-8s → %s\n' \
    "$TS" "$TASK_ID" "$phase" "$msg" >> "$LOG_FILE"
}

emit_event() {
  local event_type="$1" extra="${2:-}"
  printf '{"ts":"%s","agent":"ralph","event":"%s","task":"%s","session":"%s"%s}\n' \
    "$TS" "$event_type" "$TASK_ID" "$SESSION" "$extra" >> "$EVENTS_FILE"
}

# ── Bash tool — detect phase from command patterns ────────────────────────────
if [[ "$TOOL" == "Bash" ]]; then

  case "$CMD" in

    # SELECT — scanning the queue
    *"ls .tasks/queue"*)
      log_phase "SELECT" "scanning queue"
      ;;

    # SELECT — claiming a task (mv queue/ → in-progress/)
    *"mv .tasks/queue/"*".tasks/in-progress/"*)
      CLAIMED=$(echo "$CMD" | grep -oE '[0-9]+-[a-z-]+' | head -1)
      log_phase "SELECT" "claimed: ${CLAIMED:-task}"
      emit_event "task_started" ",\"claimed\":\"${CLAIMED:-unknown}\""
      ;;

    # PLAN — plan step explicitly logged by ralph
    *"## Plan"*|*"ralph: plan"*)
      log_phase "PLAN" "implementation plan saved to task file"
      ;;

    # IMPL — checkpoint creation
    *"ralph-checkpoint"*|*"git stash"*"ralph"*)
      LABEL=$(echo "$CMD" | grep -oE 'ralph-checkpoint-[0-9]+-[0-9]+' | head -1)
      log_phase "IMPL" "checkpoint: ${LABEL:-snapshot}"
      ;;

    # VERIFY — pytest
    *"pytest"*)
      if [[ "$IS_ERROR" == "true" ]]; then
        FAIL_COUNT=$(echo "$EVENT" | jq -r '.tool_response.content // ""' \
          | grep -oE '[0-9]+ failed' | head -1)
        log_phase "VERIFY" "pytest FAILED (${FAIL_COUNT:-unknown failures})"
        emit_event "test_failed" ",\"runner\":\"pytest\""
      else
        PASS_COUNT=$(echo "$EVENT" | jq -r '.tool_response.content // ""' \
          | grep -oE '[0-9]+ passed' | head -1)
        log_phase "VERIFY" "pytest passed (${PASS_COUNT:-all tests})"
      fi
      ;;

    # VERIFY — npm test
    *"npm test"*)
      if [[ "$IS_ERROR" == "true" ]]; then
        log_phase "VERIFY" "npm test FAILED"
        emit_event "test_failed" ",\"runner\":\"jest\""
      else
        log_phase "VERIFY" "npm test passed"
      fi
      ;;

    # VERIFY — ruff lint
    *"ruff check"*)
      if [[ "$IS_ERROR" == "true" ]]; then
        log_phase "VERIFY" "ruff: lint errors found"
      else
        log_phase "VERIFY" "ruff: clean"
      fi
      ;;

    # VERIFY — TypeScript type check
    *"tsc --noEmit"*)
      if [[ "$IS_ERROR" == "true" ]]; then
        log_phase "VERIFY" "tsc: type errors found"
      else
        log_phase "VERIFY" "tsc: clean"
      fi
      ;;

    # COMMIT — git commit
    *"git commit"*)
      HASH=$(echo "$EVENT" | jq -r '.tool_response.content // ""' \
        | grep -oE '[a-f0-9]{7,40}' | head -1)
      MSG=$(echo "$CMD" | grep -oP '(?<=-m ").*(?=")' | head -c 72)
      log_phase "COMMIT" "${HASH:+[$HASH] }${MSG:-commit}"
      emit_event "committed" "${HASH:+,\"hash\":\"${HASH:0:7}\"}"
      ;;

    # DONE — move to completed/
    *"mv .tasks/in-progress/"*".tasks/completed/"*)
      TASK=$(echo "$CMD" | grep -oE '[0-9]+-[a-z-]+' | head -1)
      log_phase "DONE" "✓ completed: ${TASK:-task}"
      emit_event "task_completed" ",\"files_modified\":\"unknown\",\"attempts\":\"unknown\""
      ;;

    # DONE — move to blocked/
    *"mv .tasks/in-progress/"*".tasks/blocked/"*)
      TASK=$(echo "$CMD" | grep -oE '[0-9]+-[a-z-]+' | head -1)
      log_phase "DONE" "✗ blocked: ${TASK:-task} — human review required"
      emit_event "task_blocked" ""
      ;;

  esac

# ── Write / Edit tool — detect phase from file paths ─────────────────────────
elif [[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]]; then

  REL_PATH="${FILE_PATH#*/taskforge/}"   # strip leading absolute prefix for readability

  case "$FILE_PATH" in

    # IMPL — source file modified
    *fastapi/app/*|*nextjs/app/*|*nextjs/components/*|*nextjs/lib/*)
      log_phase "IMPL" "modified: $REL_PATH"
      ;;

    # IMPL — test file modified
    *fastapi/tests/*|*nextjs/tests/*)
      log_phase "IMPL" "test updated: $REL_PATH"
      ;;

    # PLAN — task file in in-progress updated (plan being written)
    *.tasks/in-progress/*)
      log_phase "PLAN" "task file updated: $(basename "$FILE_PATH")"
      ;;

    # DONE — task moved/written to completed
    *.tasks/completed/*)
      log_phase "DONE" "✓ task file in completed/"
      ;;

    # DONE — task moved/written to blocked
    *.tasks/blocked/*)
      log_phase "DONE" "✗ task file in blocked/"
      ;;

  esac

fi

exit 0
