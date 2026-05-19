#!/usr/bin/env python3
"""
PostToolUse audit hook.

Appends a JSONL entry to .claude/logs/audit.log for every Bash command
executed and every Write that completes. Never modifies tool output or
blocks execution — exits 0 unconditionally.

Log format (one JSON object per line):
  {"ts":"2026-05-11T10:23:45+00:00","session":"abc12345","tool":"Bash","command":"git status"}
  {"ts":"2026-05-11T10:23:46+00:00","session":"abc12345","tool":"Write","path":"/abs/path/file.ts"}
  {"ts":"2026-05-11T10:23:47+00:00","session":"abc12345","tool":"Bash","command":"rm -rf /","error":true}
"""
import json
import os
import sys
from datetime import datetime, timezone

LOG_FILE = os.path.join(".claude", "logs", "audit.log")
MAX_CMD_LEN = 500  # truncate runaway commands; full command still went to the tool


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    tool = event.get("tool_name", "")
    inputs = event.get("tool_input") or {}
    response = event.get("tool_response") or {}
    session = event.get("session_id", "")

    entry: dict = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tool": tool,
    }
    if session:
        entry["session"] = session[:8]

    if tool == "Bash":
        cmd = inputs.get("command", "")
        entry["command"] = cmd if len(cmd) <= MAX_CMD_LEN else cmd[:MAX_CMD_LEN] + "…"
        if response.get("is_error"):
            entry["error"] = True
    elif tool == "Write":
        entry["path"] = inputs.get("file_path", "")
        if response.get("is_error"):
            entry["error"] = True
    else:
        sys.exit(0)

    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
