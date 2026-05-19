Run the full test suite for both tracks with coverage, then report results clearly.

## Steps

### Next.js (`nextjs/`)

```bash
cd nextjs && npx jest --coverage --coverageReporters=text --coverageReporters=text-summary 2>&1
```

### FastAPI (`fastapi/`)

```bash
cd fastapi && source .venv/bin/activate && pytest --cov=app --cov-report=term-missing --cov-fail-under=80 -v 2>&1
```

## Report format

After running both suites, summarize results in this format:

```
=== Test Results ===

Next.js
  Tests:    X passed, Y failed
  Coverage: Z% (lines)
  Status:   PASS / FAIL

FastAPI
  Tests:    X passed, Y failed
  Coverage: Z% (lines)
  Status:   PASS / FAIL

Overall: PASS / FAIL
```

- Mark **FAIL** if any test fails or if coverage is below 80% in either track.
- If a track's virtual environment or dependencies are missing, report that clearly instead of failing silently.
- Show the full terminal output for any failing tests so the user can see what broke.
