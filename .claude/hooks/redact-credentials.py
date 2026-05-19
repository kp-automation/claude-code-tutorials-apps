#!/usr/bin/env python3
"""PostToolUse hook: redact database credentials and secrets from Read tool output."""
import json
import re
import sys

# Each tuple is (pattern, replacement).
# Ordered from most-specific to least-specific so broad patterns don't shadow narrow ones.
PATTERNS: list[tuple[str, str]] = [
    # Connection strings with embedded user:password — postgresql://user:pass@host/db
    (
        r"((?:postgresql|postgres|mysql|mongodb(?:\+srv)?|redis|amqps?)://)[^:/\s]+:[^@/\s]+(@)",
        r"\1[REDACTED]:[REDACTED]\2",
    ),
    # Named database URL env vars
    (
        r"(?im)^([ \t]*(?:export[ \t]+)?"
        r"(?:DATABASE_URL|DB_URL|DB_URI"
        r"|POSTGRES(?:_URL|_URI|_PASSWORD|_PASS|URL)?"
        r"|MYSQL(?:_URL|_PASSWORD|_PASS)?"
        r"|MONGO(?:_URL|_URI|DB_URI)?"
        r"|REDIS_URL)"
        r"[ \t]*=[ \t]*)\S+",
        r"\1[REDACTED]",
    ),
    # Secret / signing key env vars
    (
        r"(?im)^([ \t]*(?:export[ \t]+)?"
        r"(?:SECRET_KEY|NEXTAUTH_SECRET|JWT_SECRET|SESSION_SECRET"
        r"|APP_SECRET|AUTH_SECRET|ENCRYPTION_KEY|SIGNING_KEY)"
        r"[ \t]*=[ \t]*)\S+",
        r"\1[REDACTED]",
    ),
    # Any env var whose name ends with a sensitive suffix
    (
        r"(?im)^([ \t]*(?:export[ \t]+)?"
        r"\w+_(?:PASSWORD|PASSWD|SECRET|API_KEY|ACCESS_TOKEN|AUTH_TOKEN|PRIVATE_KEY)"
        r"[ \t]*=[ \t]*)\S+",
        r"\1[REDACTED]",
    ),
    # Bare PASSWORD / SECRET / API_KEY / PRIVATE_KEY (no prefix)
    (
        r"(?im)^([ \t]*(?:export[ \t]+)?"
        r"(?:PASSWORD|PASSWD|SECRET|API_KEY|PRIVATE_KEY)"
        r"[ \t]*=[ \t]*)\S+",
        r"\1[REDACTED]",
    ),
]


def redact(text: str) -> str:
    for pattern, replacement in PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text


def extract_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    tool_response = event.get("tool_response")
    if not isinstance(tool_response, dict):
        sys.exit(0)

    raw = tool_response.get("content", "")
    original = extract_text(raw)

    if not original.strip():
        sys.exit(0)

    redacted = redact(original)
    if redacted == original:
        sys.exit(0)  # nothing changed — pass through silently

    # Emit the replacement. Claude sees this instead of the raw file content.
    print(json.dumps({"output": redacted}))


if __name__ == "__main__":
    main()
