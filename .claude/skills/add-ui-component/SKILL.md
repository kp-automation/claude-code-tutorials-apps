---
name: add-ui-component
description: Add a new React component to the Next.js track of TaskForge — covers file structure, props interface, shadcn/ui primitives, Tailwind styling, accessibility, and RTL test coverage.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# Add UI Component Skill

Add a production-ready React component to `nextjs/components/`. This skill applies to feature components — the building blocks that compose pages. It does **not** apply to shadcn/ui primitives in `components/ui/`, which are generated tooling outputs and should not be hand-edited.

Derive these values from the component name (PascalCase noun, e.g. `TaskCard`):

| Variable | Derivation | Example |
|---|---|---|
| `COMPONENT` | PascalCase argument | `TaskCard` |
| `COMPONENT_FILE` | kebab-case | `task-card` |
| `PROPS_INTERFACE` | `COMPONENTProps` | `TaskCardProps` |

---

## Component types

Choose the right shape before starting.

| Type | When to use | Examples |
|---|---|---|
| **Presentational** | Renders data passed as props; no API calls | `TaskCard`, `TaskFilters` |
| **Interactive / form** | Owns local UI state; calls parent callbacks on action | `TaskForm`, `CommentThread` |
| **Container / orchestrator** | Fetches or mutates data, composes sub-components | `TaskBoard`, `ProjectList` |
| **Context provider + hook** | Shared async state consumed by many components | `NotificationsProvider` + `useNotifications` |

Most new components are presentational or interactive. If a component needs to call an API route, it either delegates to a callback prop (preferred) or calls `fetch` directly and owns the loading/error state.

---

## Goal

Produce a correctly structured, accessible, tested component in `nextjs/components/COMPONENT_FILE.tsx` and its test in `nextjs/tests/components/COMPONENT_FILE.test.tsx`.

---

## Constraints

These are non-negotiable conventions observed throughout the codebase. Violating any of them introduces silent inconsistencies.

### File and export rules

- **Every component file must start with `"use client";`** on line 1 — no Server Components exist in `components/`.
- **Use named exports only.** `export function TaskCard(...)` — never `export default`.
- **One component per file** unless a small sub-component is tightly coupled and never reused (e.g. a chip inside a selector). If a sub-component might grow, give it its own file.
- File name is kebab-case: `task-card.tsx`. Component name is PascalCase: `TaskCard`.

### Props interface

- Declare props as an inline `interface COMPONENTProps` at the top of the file — not exported unless the parent explicitly needs to reference the data shape.
- Export the interface when it defines a data-transfer shape the parent must construct (e.g. `TaskFormData`).
- Augment Prisma types inline on the interface — `Task & { assignee: Pick<User, "id" | "name" | "email"> | null }` — rather than creating wrapper types in `lib/types.ts`.

### Where types come from

- **Prisma model types** (`Task`, `User`, `Project`, etc.): import directly from `@prisma/client`.
- **Union types** (`TaskStatus`, `Priority`, `Role`, etc.): import from `@/lib/types`.
- **Augmented/detail types** (`TaskWithDetails`, `ProjectWithTasks`): defined in `@/lib/types` — import from there if the exact shape already exists; otherwise augment inline.
- **Never import Prisma model types from `@/lib/types`** — that file re-exports them, but components should import them from `@prisma/client` directly.

### Styling

- **Tailwind only** — no CSS modules, no styled-components, no inline `style={{}}` objects.
- Use `cn()` from `@/lib/utils` when combining conditional classes: `cn("base-class", condition && "conditional-class")`. Direct template-string composition is also fine for static classes — match the surrounding file.
- Use the design-token classes (`text-muted-foreground`, `bg-primary`, `text-destructive`, `border-input`, etc.) rather than hard-coding raw colors.
- Empty-state pattern: `<div className="text-center py-8 text-muted-foreground text-sm">`.
- **Icons from `lucide-react`** — no other icon library.

### shadcn/ui primitives

Available in `@/components/ui/`: `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, `Input`, `Label`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Textarea`.

- Use primitives for all standard controls — don't hand-roll buttons, inputs, or dialogs.
- `Button` variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- `Button` sizes: `default`, `sm`, `lg`, `icon`.
- Do not edit files inside `components/ui/` — they are shadcn-generated.

### State and interactivity

- Local state only — `useState`. No global state libraries.
- Async actions: `isSubmitting` state gates the submit button and all inputs (`disabled={isSubmitting}`). Prevents double-submit.
- Form submissions: always `e.preventDefault()` before the async call. Restore `isSubmitting = false` in `finally`.
- Callbacks flow up: the component calls `onX(data)` and the parent decides what to do next. The component does not navigate or mutate global state directly.
- If the component must call a fetch API directly (like `CommentThread`): wrap in try/catch, set loading state, call a parent-provided `onSuccess` callback.

### Accessibility

- Interactive elements that are not `<button>` or `<a>` need `role` and keyboard handling.
- Custom disclosure patterns (toggle open/close): use `aria-label`, `aria-haspopup="true"`, `aria-expanded={open}`.
- Click-outside + Escape-to-close for popups: add `mousedown` and `keydown` listeners on `document` inside a `useEffect`; remove them in the cleanup. See `notification-bell.tsx` for the canonical pattern.
- Remove buttons inside chip/tag lists need `aria-label="Remove X"` so screen readers distinguish them.
- `data-testid` on any element that tests need to find by role-ambiguous identity (badges, conditional content, list items in dynamic lists).

---

## Step-by-step

### Step 1 — Read the surrounding context

Before writing any code, read the components the new one will interact with. If it renders tasks, read `task-card.tsx`. If it sits inside the task board, read `task-board.tsx`. Identify:
- What props will the parent pass down?
- What callbacks does the parent expect?
- What Prisma types or union types are needed?
- Which shadcn/ui primitives are already in use nearby?

### Step 2 — Write the component file

Template for a presentational component:

```tsx
"use client";

import { ComponentTypeFromPrisma } from "@prisma/client";
import { SomeUnion } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  item: ComponentTypeFromPrisma & {
    relatedEntity: Pick<RelatedType, "id" | "name"> | null;
  };
  onAction?: () => void;
  className?: string;
}

export function MyComponent({ item, onAction, className }: MyComponentProps) {
  return (
    <Card className={cn("cursor-pointer", className)} onClick={onAction}>
      <CardContent className="p-4">
        <p>{item.title}</p>
        {item.relatedEntity ? (
          <span>{item.relatedEntity.name}</span>
        ) : (
          <span className="text-muted-foreground">None assigned</span>
        )}
      </CardContent>
    </Card>
  );
}
```

Template for an interactive/form component:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MyFormData {
  title: string;
}

interface MyFormProps {
  initialValues?: Partial<MyFormData>;
  onSubmit: (data: MyFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  error?: string | null;
}

export function MyForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  error,
}: MyFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ title });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="my-title">Title</Label>
        <Input
          id="my-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="form-error">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

### Step 3 — Write the test file

Test file lives at `nextjs/tests/components/COMPONENT_FILE.test.tsx`.

**Key RTL patterns used in this codebase:**

- Import `render`, `screen`, `fireEvent` from `@testing-library/react`.
- No `userEvent` — use `fireEvent.click`, `fireEvent.change`.
- Mock heavy dependencies at the top with `jest.mock(...)`.
- Build fixtures as `const mockX = { ... }` near the top — shared across tests.
- Describe blocks for logical groups (`"chip rendering"`, `"form submission"`, etc.).
- Use `data-testid` selectors for conditional/dynamic elements; use `getByText` / `getByLabelText` / `getByRole` for stable content.

**Radix UI Select (and other portal-based primitives) don't render in jsdom.** Mock `@/components/ui/select` whenever the component uses `<Select>`:

```tsx
jest.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, disabled, children }: any) => (
    <select
      data-testid="my-select"
      disabled={disabled}
      defaultValue=""
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, disabled, children }: any) => (
    <option value={value} disabled={disabled}>{children}</option>
  ),
}));
```

**Mock child components** that are complex or have their own network/context dependencies:

```tsx
jest.mock("@/components/heavy-child", () => ({
  HeavyChild: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="heavy-child-stub">
      <button onClick={onClose}>close-stub</button>
    </div>
  ),
}));
```

**Mock context hooks** that the component consumes:

```tsx
jest.mock("@/components/notifications-provider", () => ({
  useNotifications: jest.fn(),
}));

import { useNotifications } from "@/components/notifications-provider";
const mockedUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

function setHookValue(overrides: Partial<ReturnType<typeof useNotifications>>) {
  mockedUseNotifications.mockReturnValue({
    // full default shape
    unreadCount: 0,
    ...overrides,
  });
}
```

**Minimum test coverage expected:**

| Scenario | What to assert |
|---|---|
| Renders with valid props | Key content appears (`getByText`, `getByRole`) |
| Conditional rendering on/off | Element present vs. `queryByX` returning null |
| Callback fired on interaction | `fireEvent.click` → `jest.fn()` called with correct args |
| Disabled state | `disabled` attribute; callback not called |
| Empty/null data | Empty-state text appears; no crash |
| Error prop displayed | `data-testid="form-error"` visible with message |

### Step 4 — Run the test

```bash
cd nextjs && npx jest tests/components/COMPONENT_FILE.test.tsx --no-coverage
```

Fix any failures before reporting done. Common RTL failures:

| Error | Cause | Fix |
|---|---|---|
| `Unable to find an accessible element with the role "option"` | Radix Select not mocked | Mock `@/components/ui/select` |
| `TestingLibraryElementError: Unable to find an element by: [data-testid="X"]` | Element doesn't exist yet | Check conditional rendering logic |
| `Warning: An update to X inside a test was not wrapped in act(...)` | Async state update without `await` | Wrap in `await act(async () => { ... })` |
| `Cannot read properties of undefined (reading 'id')` | Fixture missing required field | Add the field to `mockX` |

---

## Acceptance Criteria Checklist

Mark every item before calling the component done.

### File structure
- [ ] File created at `nextjs/components/COMPONENT_FILE.tsx`
- [ ] First line is `"use client";`
- [ ] Named export: `export function COMPONENT`
- [ ] Props declared as inline `interface COMPONENTProps`

### Types and imports
- [ ] Prisma model types imported from `@prisma/client`, not `@/lib/types`
- [ ] Union types (`TaskStatus`, `Priority`, etc.) imported from `@/lib/types` if used
- [ ] No `new PrismaClient()` — components don't instantiate DB clients
- [ ] shadcn/ui primitives imported from `@/components/ui/` — no hand-rolled buttons/inputs/dialogs
- [ ] Icons from `lucide-react` if any icons are needed

### Styling
- [ ] Tailwind only — no inline styles, no CSS modules
- [ ] Design token classes used (`text-muted-foreground`, `bg-primary`, etc.) instead of raw color values
- [ ] Empty state uses the standard pattern: `text-center py-8 text-muted-foreground text-sm`
- [ ] `cn()` used for conditional class composition (when conditional classes are needed)

### State and behavior
- [ ] Async actions guarded by `isSubmitting` — button and inputs are `disabled={isSubmitting}`
- [ ] Forms call `e.preventDefault()` before any async work
- [ ] `isSubmitting` reset in `finally` block — not just in the success path
- [ ] Callbacks called on user actions; component does not navigate or mutate outside its scope
- [ ] `data-testid` added on any element that tests need to find by dynamic/conditional identity

### Accessibility
- [ ] Custom disclosure buttons have `aria-label`, `aria-haspopup`, `aria-expanded`
- [ ] Click-outside / Escape handling added for any popup (listeners registered in `useEffect` with cleanup)
- [ ] Remove/action buttons in lists have descriptive `aria-label` (e.g. `"Remove dependency Task One"`)

### Tests
- [ ] Test file at `nextjs/tests/components/COMPONENT_FILE.test.tsx`
- [ ] Radix UI portal-based primitives mocked (Select, Dialog) if used by the component
- [ ] Context hooks mocked if used by the component
- [ ] Child components that have their own dependencies mocked as stubs
- [ ] Covers: renders with valid props, conditional rendering states, callback invocation, disabled state, empty/null data
- [ ] `npx jest tests/components/COMPONENT_FILE.test.tsx` passes with no errors or warnings
