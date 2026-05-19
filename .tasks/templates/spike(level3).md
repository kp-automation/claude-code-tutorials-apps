# [Spike Title — phrase as a question or decision: "Evaluate real-time transport options for notification delivery"]

## Spike Summary

| Field | Value |
|-------|-------|
| **Type** | <!-- Feasibility / Technology evaluation / Design / Performance / Security / API exploration --> |
| **Track(s) affected** | <!-- Next.js / FastAPI / Both / Neither (architecture only) --> |
| **Time budget** | <!-- e.g. "4 hours", "1 day", "2 days max" --> |
| **Start date** | <!-- YYYY-MM-DD --> |
| **Hard stop** | <!-- YYYY-MM-DD — do not exceed; timebox is a constraint, not a suggestion --> |
| **Unblocks** | <!-- Which feature/fix task cannot start until this is resolved --> |
| **Status** | <!-- In progress / Findings ready / Recommendation accepted / Abandoned --> |

> **A spike produces a decision, not a PR.**
> Code written during a spike is throwaway unless explicitly promoted. If the answer is
> "we don't know yet," that is a valid finding — record what was learned and what would
> resolve the remaining uncertainty.

---

## Context

### Why this spike exists

<!-- One paragraph: what problem or decision prompted the investigation.
     Name the feature or task that is blocked until this is resolved.
     e.g. "The notifications feature (see add-notifications.md) requires a delivery
     mechanism. We need to decide between polling, SSE, and WebSockets before
     writing any server-side code, because the choice affects the data model,
     the auth layer, and the deployment topology." -->

### What decision this unblocks

<!-- The concrete choice that will be made based on findings.
     Phrase it as a decision statement, not a task.
     e.g. "Choose a notification transport strategy and document the constraints
     so the implementation task can start with a clear technical direction." -->

### What happens if we skip this spike

<!-- The risk of guessing rather than investigating.
     e.g. "If we start with WebSockets and hit the Next.js deployment constraint,
     we will need to rewrite the transport layer mid-feature." -->

---

## Research Questions

<!-- Specific, answerable questions — not topics. Each question should have a
     clear answer by the end of the spike. Rank by priority so if time runs out,
     the most critical questions are answered first. -->

**Must answer (blocking)**
1. <!-- e.g. "Does Next.js App Router support long-lived SSE connections in the same process as API routes?" -->
2. <!-- e.g. "What is the latency floor for the 30s polling approach under typical load?" -->
3. <!-- e.g. "Can FastAPI serve WebSocket connections alongside HTTP routes without a separate process?" -->

**Should answer (important but not blocking)**
4. <!-- e.g. "Does the Prisma client hold connections open in a way that would interfere with SSE?" -->
5. <!-- e.g. "What do other Next.js + FastAPI projects use for real-time in 2026?" -->

**Nice to answer (if time allows)**
6. <!-- e.g. "Is there a shared abstraction that would let us swap transports later without changing the client?" -->

---

## Hypothesis

<!-- What you expect to find, stated before you look.
     A hypothesis that turns out to be wrong is more valuable than no hypothesis —
     it sharpens what the investigation actually discovered. -->

**Expected answer to Q1:** <!-- e.g. "SSE is supported but requires disabling response streaming buffering." -->
**Expected answer to Q2:** <!-- e.g. "Polling adds ~30s average latency which is acceptable for this use case." -->
**Expected answer to Q3:** <!-- e.g. "FastAPI supports WebSockets natively via Starlette." -->

**Overall lean before investigation:**
<!-- e.g. "Polling is probably sufficient for v1 given the low event frequency." -->

---

## Constraints & Knowns

<!-- What is already established — do not re-investigate. -->

**Hard constraints**
<!-- Non-negotiable technical or product limits that bound the solution space. -->
- <!-- e.g. "Deployment target is a single-process server; no separate pub/sub infrastructure." -->
- <!-- e.g. "No new npm packages without user approval." -->
- <!-- e.g. "Auth is JWT-based; any real-time channel must validate the same token." -->

**Already decided**
<!-- Prior decisions that narrow the options — link to the task or decision if one exists. -->
- <!-- e.g. "Notification data model is already designed (see add-notifications.md Phase 1)." -->
- <!-- e.g. "Client polling interval is 30s per the add-notifications spec." -->

**Known non-starters**
<!-- Options that are already ruled out and why — so the spike doesn't waste time on them. -->
- <!-- e.g. "Pusher / third-party push services: rejected due to external dependency policy." -->
- <!-- e.g. "WebSocket-only approach: ruled out because FastAPI and Next.js would need separate WS servers." -->

---

## Out of Scope

<!-- Explicit boundaries. Prevents the spike from expanding into implementation. -->

- This spike does **not** implement any feature — findings feed into a follow-up task.
- <!-- e.g. "Does not evaluate email delivery — out of scope for notification v1." -->
- <!-- e.g. "Does not benchmark database query performance — separate concern." -->
- <!-- e.g. "Does not prototype the UI — only the data transport layer is in scope." -->

---

## Investigation Areas

<!-- Structured areas to explore, not sequential steps.
     Each area maps to one or more research questions.
     Abandon or deprioritize areas early if a more critical question gets answered first. -->

### Area 1: [Name — e.g. "Next.js SSE support"]

**Maps to:** Q<!-- 1, 2 -->
**Approach:** <!-- How you'll investigate: read docs, write a minimal test, read source code, benchmark, etc. -->
**Time budget:** <!-- e.g. "1 hour" -->

Key things to check:
- <!-- e.g. "Does `Response` streaming work in App Router API routes (`route.ts`)?" -->
- <!-- e.g. "Does `edge` runtime support streaming or only `node` runtime?" -->
- <!-- e.g. "Does `getServerSession` work inside a streaming response handler?" -->

**Entry points / resources:**
- <!-- File to read: `nextjs/app/api/tasks/route.ts` — see how current handlers are structured -->
- <!-- Docs URL provided by user (if any) -->
- <!-- Relevant codebase file: `fastapi/app/main.py` — see current CORS + router setup -->

---

### Area 2: [Name]

**Maps to:** Q<!-- 3, 4 -->
**Approach:** <!-- ... -->
**Time budget:** <!-- ... -->

Key things to check:
- <!-- ... -->

---

### Area 3: [Name]

**Maps to:** Q<!-- 5, 6 -->
**Approach:** <!-- ... -->
**Time budget:** <!-- ... -->

Key things to check:
- <!-- ... -->

---

## Experiments

<!-- Specific, time-boxed things to try. Each experiment has a setup, an observation,
     and what the observation means for the decision. Keep experiments minimal —
     the goal is signal, not production-quality code. -->

### Experiment 1: [Short name]

**Question it answers:** Q<!-- N -->
**Time limit:** <!-- e.g. "45 minutes — stop and record partial findings if not done" -->

**Setup:**
```bash
# Minimal steps to run the experiment
# e.g. spin up a minimal Next.js route that streams events
```

**What to observe:**
- <!-- e.g. "Does the client receive events without the connection dropping?" -->
- <!-- e.g. "Does the response complete immediately instead of streaming?" -->

**Expected outcome:** <!-- What you think will happen based on the hypothesis -->

**Actual outcome:** <!-- Fill in after running — paste relevant output, error, or observation -->

```
<!-- Paste the relevant output here -->
```

**Interpretation:** <!-- What the outcome means for the research question and the overall decision -->

---

### Experiment 2: [Short name]

**Question it answers:** Q<!-- N -->
**Time limit:** <!-- ... -->

**Setup:**
```bash
# ...
```

**What to observe:**
- <!-- ... -->

**Expected outcome:** <!-- ... -->
**Actual outcome:** <!-- ... -->
**Interpretation:** <!-- ... -->

---

### Experiment 3: [Short name — optional, only if time allows]

**Question it answers:** Q<!-- N -->
**Time limit:** <!-- ... -->

<!-- ... -->

---

## Findings

<!-- Answers to the research questions, discovered during the spike.
     Fill in as you go — don't wait until all experiments are done.
     One clear statement per question. "Unknown" is a valid answer if time ran out. -->

### Must-answer questions

**Q1:** <!-- e.g. "Next.js App Router does support SSE via Response streaming, but only in the `node` runtime." -->
- Evidence: <!-- e.g. "Experiment 1 — streaming handler returned events; Experiment 2 showed edge runtime blocks." -->
- Confidence: <!-- High / Medium / Low — and why -->

**Q2:** <!-- ... -->
- Evidence: <!-- ... -->
- Confidence: <!-- ... -->

**Q3:** <!-- ... -->
- Evidence: <!-- ... -->
- Confidence: <!-- ... -->

### Should-answer questions

**Q4:** <!-- ... -->
**Q5:** <!-- ... -->

### Nice-to-answer questions

**Q6:** <!-- "Not investigated — time ran out after Q1–Q3 were resolved." -->

### Surprises

<!-- Anything discovered that contradicted the hypothesis or wasn't anticipated.
     These are often the most valuable findings. -->
- <!-- e.g. "FastAPI's WebSocket support requires `uvicorn` with `--ws` flag, which is not in the current Makefile." -->
- <!-- e.g. "Prisma holds a connection pool that conflicts with long-lived SSE handlers in dev mode." -->

---

## Prototype Notes

<!-- If any throwaway code was written, document it here.
     Prototypes prove a point — they are NOT a starting point for implementation. -->

### What was built

<!-- One sentence describing what the prototype does. -->

### Where it lives

<!-- Branch, directory, or file. Mark it clearly as throwaway. -->
- Branch: `spike/...` (throwaway — do not merge)
- File(s): `<!-- path -->` (delete after spike is closed)

### What it proves

<!-- The specific finding the prototype demonstrates.
     e.g. "Proves that SSE from a Next.js `route.ts` handler delivers events to a browser
     EventSource without additional configuration." -->

### What it does NOT prove

<!-- Limitations of the prototype — what the real implementation will still need to address.
     e.g. "Does not handle auth. Does not handle reconnect. Uses hardcoded data." -->

### Cleanup required

- [ ] Delete prototype branch `spike/...`
- [ ] Delete throwaway files: `<!-- list them -->`

---

## Decision Log

<!-- The output that matters. Record the options considered, tradeoffs, and the chosen path.
     Written after findings are complete but before follow-up tasks are created. -->

### Options considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| <!-- e.g. Polling (30s interval) --> | <!-- Simple, no infra change --> | <!-- 30s latency, wasted requests --> | <!-- Chosen / Rejected --> |
| <!-- e.g. SSE from Next.js --> | <!-- Lower latency, no WS infra --> | <!-- Requires node runtime, reconnect handling --> | <!-- ... --> |
| <!-- e.g. WebSockets via FastAPI --> | <!-- Bidirectional, real-time --> | <!-- Separate process needed, auth complexity --> | <!-- ... --> |

### Chosen approach

<!-- The recommendation, stated plainly. One paragraph max.
     Include the key constraint or finding that drove the choice.
     e.g. "Use 30s polling for v1. The event frequency is low (a few per hour per user),
     the latency is acceptable per the product spec, and it requires no infra changes.
     SSE is the right next step if latency requirements tighten, but the Next.js runtime
     constraint (node-only) needs to be validated first in a follow-up." -->

### Conditions that would change the recommendation

<!-- What would make a different option the right choice in the future.
     e.g. "Switch to SSE if: (a) users report 30s delay feels too slow, or (b) polling
     load becomes measurable in production metrics." -->

### Open questions not resolved by this spike

<!-- Things that remain unknown — document them so they don't silently become assumptions.
     e.g. "Q6 (shared transport abstraction) was not investigated — low priority for v1." -->

---

## Follow-up Tasks

<!-- Concrete work items produced by this spike. Each item is either:
     (a) a new task to create in .tasks/todo/, or
     (b) an update to an existing task's Notes / Technical Investigation section. -->

| Action | Type | Owner | Notes |
|--------|------|-------|-------|
| <!-- e.g. "Implement polling transport in add-notifications.md" --> | <!-- Update existing task --> | <!-- ... --> | <!-- Link to the finding that shaped it --> |
| <!-- e.g. "Add --ws flag to Makefile for FastAPI dev server" --> | <!-- New fix/ task --> | <!-- ... --> | <!-- Discovered in Experiment 2 --> |
| <!-- e.g. "File spike for SSE feasibility if polling latency becomes a concern" --> | <!-- Future spike --> | <!-- ... --> | <!-- Conditional on user feedback --> |

---

## Time Log

<!-- Track actual time vs. budget. Update as work happens. -->

| Date | Duration | Area / Experiment | Notes |
|------|----------|-------------------|-------|
| YYYY-MM-DD | <!-- e.g. 1h --> | <!-- Area 1 + Experiment 1 --> | <!-- What was explored --> |
| YYYY-MM-DD | <!-- e.g. 2h --> | <!-- Experiments 2–3, Decision Log --> | <!-- ... --> |

**Total spent:** <!-- X hours of Y budgeted -->

> If the hard stop arrives before all questions are answered: record what is known,
> make a recommendation based on available evidence, and document what remains uncertain.
> A partial finding with a confidence level is more useful than no answer.

---

## Progress Log

<!-- Append a dated entry each time work is resumed or a direction changes.
     Most recent entry at the top. One or two sentences per entry. -->

| Date | Update |
|------|--------|
| YYYY-MM-DD | <!-- What was investigated / what was found / what's next or blocked. --> |

---

## Completion

<!-- Fill in when the spike is closed and moved to done/. -->

**Closed on:** <!-- YYYY-MM-DD -->
**Time spent vs. budget:** <!-- X hours of Y budgeted -->

**One-sentence verdict:**
<!-- e.g. "Use 30s polling for v1; SSE is viable but requires node runtime confirmation." -->

**Recommendation accepted by:** <!-- User / team — and on what date -->

**Hypothesis was:** <!-- Correct / Partially correct / Wrong — and what the divergence was -->

**Key findings (top 3):**
1. <!-- ... -->
2. <!-- ... -->
3. <!-- ... -->

**Follow-up tasks created:**
<!-- List the .tasks/todo/ files created or tasks updated as a result. -->
- <!-- `.tasks/todo/<task>.md` created -->
- <!-- `.tasks/in-progress/<task>.md` updated — Notes section -->

**Prototype cleanup done:**
- [ ] Spike branch deleted
- [ ] Throwaway files removed
- [ ] N/A — no prototype written
