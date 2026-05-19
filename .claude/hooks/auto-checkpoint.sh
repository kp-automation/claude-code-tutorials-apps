#!/usr/bin/env bash
# PreToolUse hook — saves a lightweight git restore point before each source file edit.
#
# Fires before Write and Edit tool calls. When Ralph has an active task and
# the target file is within an allowed source path, this hook records the
# current HEAD SHA so Ralph has an exact restore point if verification fails.
#
# Restore command (run by Ralph on rollback):
#   git reset --hard $(cat .claude/logs/ralph-checkpoint.sha)
#
# Also writes a WIP commit when there are staged changes that would otherwise
# be lost — the commit is tagged so it can be squashed or dropped later.
#
# Exit codes:
#   0  — always; this hook never blocks a Write or Edit call.

set -euo pipefail

# ── Dependencies ──────────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null || ! command -v git &>/dev/null; then
  exit 0
fi

# ── Parse hook input ──────────────────────────────────────────────────────────
EVENT=$(cat)
TOOL=$(echo "$EVENT"      | jq -r '.tool_name          // ""')
FILE_PATH=$(echo "$EVENT" | jq -r '.tool_input.file_path // ""')

# ── Guard: only act on Write / Edit ──────────────────────────────────────────
[[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]] || exit 0

# ── Guard: only act on source paths Ralph is allowed to touch ─────────────────
if [[ ! "$FILE_PATH" =~ /(fastapi/tests|nextjs/tests)/ ]]; then
  exit 0
fi

# ── Guard: only checkpoint when Ralph has an active task ─────────────────────
ACTIVE_TASK=$(ls .tasks/in-progress/ 2>/dev/null | grep -v '\-handoff' | head -1)
[[ -n "$ACTIVE_TASK" ]] || exit 0

# ── Setup ─────────────────────────────────────────────────────────────────────
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LOG_FILE=".claude/logs/ralph.log"
CHECKPOINT_SHA_FILE=".claude/logs/ralph-checkpoint.sha"
mkdir -p "$(dirname "$LOG_FILE")"

TASK_ID=$(echo "$ACTIVE_TASK" | grep -oE '^[0-9]+' | head -1 || echo "???")
FILE_BASENAME=$(basename "$FILE_PATH")

log() {
  printf '[%s] [ralph] [TASK:%s] %-8s → %s\n' "$TS" "$TASK_ID" "CHKPT" "$1" >> "$LOG_FILE"
}

# ── Determine current git state ───────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0  # not a git repo
fi

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
[[ -n "$HEAD_SHA" ]] || exit 0

STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
TOTAL_CHANGES=$((STAGED + UNSTAGED))

# ── Count existing checkpoints for this task (for step numbering) ─────────────
STEP=$(git log --oneline 2>/dev/null | grep -c "ralph-checkpoint-${TASK_ID}-" || true)
STEP=$((STEP + 1))
LABEL="ralph-checkpoint-${TASK_ID}-${STEP}"

# ── Save restore point ────────────────────────────────────────────────────────
# Always record HEAD SHA — even if there are no changes yet, this anchors rollback.
echo "$HEAD_SHA" > "$CHECKPOINT_SHA_FILE"

if [[ "$TOTAL_CHANGES" -gt 0 ]]; then
  # Staged changes exist — commit them as a tagged WIP snapshot so they survive
  # any subsequent hard reset. The commit message marks it as a checkpoint so
  # it can be dropped from history later with `git rebase -i`.
  if [[ "$STAGED" -gt 0 ]]; then
    git commit --no-gpg-sign -m "$LABEL: WIP snapshot before editing $FILE_BASENAME" \
      2>/dev/null && {
        NEW_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
        echo "$NEW_SHA" > "$CHECKPOINT_SHA_FILE"
        log "$LABEL committed ($(echo "$NEW_SHA" | cut -c1-7)) — restore: git reset --hard $HEAD_SHA"
      }
  else
    # Only unstaged changes — save a patch as a secondary safety net
    PATCH_FILE=".claude/logs/${LABEL}.patch"
    git diff > "$PATCH_FILE" 2>/dev/null || true
    log "$LABEL patch saved to $(basename "$PATCH_FILE") — restore: git checkout -- . && git apply $PATCH_FILE"
  fi
else
  # Clean working tree — just record the SHA anchor
  log "$LABEL anchored at $(echo "$HEAD_SHA" | cut -c1-7) (clean tree, before editing $FILE_BASENAME)"
fi

exit 0
