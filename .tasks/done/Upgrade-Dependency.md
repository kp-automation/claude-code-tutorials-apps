# Upgrade ESLint 8 → 9 (Flat Config Migration)

## Description

Upgrade `eslint` from `^8.57.1` to `^9` in the Next.js track and migrate the config from the legacy `.eslintrc.json` format to ESLint 9's flat config (`eslint.config.mjs`). This is a Next.js-only change — the FastAPI track uses `ruff` for linting and is unaffected.

## Why

ESLint 8 reached end-of-life in October 2024. ESLint 9 ships a new flat config system that replaces the cascading `.eslintrc.*` format. `next/core-web-vitals` and `next/typescript` (via `eslint-config-next` 15.x) already support ESLint 9 flat config, so the timing is right.

## Scope

- [x] Next.js (config + devDependency only — no app code changes)
- [ ] FastAPI (JSON API)
- [ ] Cross-track (data model / API contract change — both tracks required)

## Acceptance Criteria

- [ ] `eslint` is `^9` in `nextjs/package.json`
- [ ] `@eslint/eslintrc` is added as a devDependency (provides `FlatCompat` for bridging `extends`-style configs)
- [ ] `nextjs/eslint.config.mjs` exists with all four rules from the old config preserved
- [ ] `nextjs/.eslintrc.json` is deleted
- [ ] `npm run lint` exits 0 with no new warnings
- [ ] `npm test` still passes (ESLint config does not affect Jest)

## Technical Notes

### Files to modify

**Next.js**
- `nextjs/package.json` — bump `eslint` to `^9`, add `@eslint/eslintrc` devDependency
- `nextjs/.eslintrc.json` — delete this file
- `nextjs/eslint.config.mjs` — create; replaces `.eslintrc.json`

### New files

- `nextjs/eslint.config.mjs` — flat config entry point using `FlatCompat` to wrap the existing `next/core-web-vitals` and `next/typescript` extends

### Why `FlatCompat` instead of native flat config

`eslint-config-next` exposes its rules via the legacy `extends` API. Until it ships a native flat-config export, `FlatCompat` from `@eslint/eslintrc` is the supported bridge. The resulting file stays small and easy to read.

### Target `eslint.config.mjs` shape

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
```

## Plan

### 1. Update `package.json`

In `nextjs/package.json`, make two changes under `devDependencies`:

- Change `"eslint": "^8.57.1"` → `"eslint": "^9"`
- Add `"@eslint/eslintrc": "^3"` (provides `FlatCompat`)

**Verify:** `grep '"eslint"' nextjs/package.json` shows `^9`; `@eslint/eslintrc` appears in devDependencies.

---

### 2. Install updated packages

```bash
cd nextjs && npm install
```

**Verify:** `node_modules/eslint/package.json` version starts with `9.`.

---

### 3. Create `eslint.config.mjs`

Create `nextjs/eslint.config.mjs` with the `FlatCompat` shape shown in Technical Notes above. All four rules from `.eslintrc.json` must be present:
- `@typescript-eslint/no-explicit-any`: `"off"`
- `@typescript-eslint/no-unused-vars`: `"warn"`
- `@typescript-eslint/no-empty-object-type`: `"off"`
- `react/no-unescaped-entities`: `"off"`

**Verify:** File exists; `cat nextjs/eslint.config.mjs` shows all four rules.

---

### 4. Delete `.eslintrc.json`

```bash
rm nextjs/.eslintrc.json
```

ESLint 9 ignores `.eslintrc.*` files entirely when a flat config is present; deleting avoids confusion.

**Verify:** `ls nextjs/.eslintrc.json` returns "no such file".

---

### 5. Smoke-test linting

```bash
cd nextjs && npm run lint
```

**Verify:** Exits 0. Any new warnings should match pre-existing issues, not new ESLint 9 rule changes.

---

### 6. Run tests

```bash
cd nextjs && npm test
```

**Verify:** All tests pass. (ESLint config does not affect Jest, but confirms nothing else broke during `npm install`.)

---

### Order summary

| Step | Track | File | Action |
|------|-------|------|--------|
| 1 | Next.js | `nextjs/package.json` | Modify — bump eslint, add @eslint/eslintrc |
| 2 | Next.js | `node_modules/` | Run `npm install` |
| 3 | Next.js | `nextjs/eslint.config.mjs` | Create — flat config |
| 4 | Next.js | `nextjs/.eslintrc.json` | Delete |
| 5 | Next.js | — | `npm run lint` smoke test |
| 6 | Next.js | — | `npm test` |

## Review Notes

**Critical**
- `@eslint/eslintrc` must be installed — `FlatCompat` is not bundled with ESLint 9 itself.
- The config file must be `.mjs` (or `eslint.config.js` with `"type": "module"` in package.json). The project doesn't have `"type": "module"` set, so `.mjs` is the safe choice.

**Gaps**
- `eslint-config-next` 15.1.0 uses the legacy `extends` API internally. If it ships a native flat-config export in a future release, the `FlatCompat` bridge can be removed, but that's a follow-up.

**Minor**
- The `.mjs` extension is consistent with what `create-next-app` scaffolds for ESLint 9 projects.

## Notes

- FastAPI is unaffected — it uses `ruff`, which is not ESLint.
- `eslint-config-next` version stays pinned to `15.1.0` (same as Next.js) — do not bump it separately.
- The intentional `@typescript-eslint/no-explicit-any: off` rule must be preserved; the codebase relies on `(session.user as any).id` throughout route handlers (documented in CLAUDE.md).

---

## Summary

### Files Created or Modified

| File | Action | Description |
|------|--------|-------------|
| `nextjs/package.json` | Modified | Bumped `eslint` from `^8.57.1` → `^9`; added `@eslint/eslintrc: ^3` as a devDependency |
| `nextjs/eslint.config.mjs` | Created | Flat config entry point using `FlatCompat` to bridge `eslint-config-next` legacy `extends` API |
| `nextjs/.eslintrc.json` | Deleted | Replaced by `eslint.config.mjs`; ESLint 9 ignores `.eslintrc.*` files when a flat config is present |

FastAPI track is unaffected — it uses `ruff` for linting.

### Key Decisions

- **`FlatCompat` over native flat config:** `eslint-config-next` 15.1.0 exposes its rules via the legacy `extends` API and does not yet ship a native flat-config export. `FlatCompat` from `@eslint/eslintrc` is the upstream-supported bridge and keeps the config small and readable.
- **`.mjs` extension:** The project does not set `"type": "module"` in `package.json`, so `.mjs` is required for ESM syntax in the config file. This matches what `create-next-app` scaffolds for ESLint 9 projects.
- **All four rules preserved:** `@typescript-eslint/no-explicit-any: off`, `@typescript-eslint/no-unused-vars: warn`, `@typescript-eslint/no-empty-object-type: off`, and `react/no-unescaped-entities: off` — all carried over from the deleted `.eslintrc.json` exactly as-is. The `no-explicit-any: off` rule is load-bearing: the codebase uses `(session.user as any).id` throughout route handlers (documented in CLAUDE.md).

### Deviations from Original Plan

- The `.eslintrc.json` was temporarily committed to the branch (commit `79ff69f`, "Add ESLint config for Next.js track") before the flat config migration was applied. The final state deletes it, but it appeared briefly as a committed file. No functional impact — the file is gone before merge.
- The ESLint upgrade, flat config creation, and `.eslintrc.json` deletion are currently in the working tree and need to be committed together as the follow-on commit to `79ff69f`.

### Anything That Should Be Documented

- If `eslint-config-next` ships a native flat-config export in a future release, the `FlatCompat` bridge in `eslint.config.mjs` can be removed. The config would shrink to a direct import. This is a follow-up, not a blocker.
- The `eslint-config-next` version is intentionally pinned to `15.1.0` (matching Next.js) — it should not be bumped independently.

---

## Completion

<!-- Fill this in when the task is moved to done/. -->

**Branch:** `feat/eslint-9-flat-config`
**Commits:**

**Summary of what shipped:**

**Decisions made:**

**Known gaps / follow-up work:**

**Testing done:**
- [ ] `npm run lint` — exits 0
- [ ] `npm test` — X/X pass
