/**
 * Unit tests for @/lib/sprint-validation
 *
 * Tests sprintCreateSchema and sprintUpdateSchema (Zod schemas).
 * All tests are pure — no database or network calls.
 *
 * Note on datetime format: z.string().datetime() requires full ISO 8601 datetime
 * strings (e.g. "2026-06-01T00:00:00.000Z"), not date-only strings.
 *
 * Note on name trimming: z.string().min(1) enforces length >= 1 but does NOT trim
 * whitespace. A single space " " passes min(1); only "" (empty string) fails.
 * Tests document the actual implementation behavior.
 *
 * NOTE: task spec listed `src/lib/__tests__/sprint-validation.test.ts` but that
 * path is outside allowed write paths and not covered by the nextjs jest config.
 * `nextjs/lib/sprint-validation.ts` and `src/lib/sprint-validation.ts` are
 * identical; this file targets `nextjs/tests/lib/` and runs under `npm test`.
 */

import { sprintCreateSchema, sprintUpdateSchema } from "@/lib/sprint-validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const START = "2026-06-01T00:00:00.000Z";
const END = "2026-06-14T00:00:00.000Z";
const BEFORE_START = "2026-05-31T23:59:59.999Z"; // one ms before START

/** A fully valid create payload. */
const validCreate = {
  name: "Sprint 1",
  startDate: START,
  endDate: END,
  projectId: "proj-1",
};

// ---------------------------------------------------------------------------
// sprintCreateSchema
// ---------------------------------------------------------------------------

describe("sprintCreateSchema", () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe("happy path", () => {
    it("accepts a fully valid payload", () => {
      const result = sprintCreateSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    it("accepts a valid payload with an explicit status", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        status: "ACTIVE",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a payload where endDate equals startDate", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        endDate: START,
      });
      expect(result.success).toBe(true);
    });

    it("accepts all three valid status values", () => {
      for (const status of ["PLANNING", "ACTIVE", "COMPLETED"] as const) {
        const result = sprintCreateSchema.safeParse({ ...validCreate, status });
        expect(result.success).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Required fields
  // -------------------------------------------------------------------------

  describe("required fields", () => {
    it("rejects when name is omitted", () => {
      const { name: _n, ...rest } = validCreate;
      const result = sprintCreateSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when startDate is omitted", () => {
      const { startDate: _s, ...rest } = validCreate;
      const result = sprintCreateSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when endDate is omitted", () => {
      const { endDate: _e, ...rest } = validCreate;
      const result = sprintCreateSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when projectId is omitted", () => {
      const { projectId: _p, ...rest } = validCreate;
      const result = sprintCreateSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Name boundary tests
  // -------------------------------------------------------------------------

  describe("name boundary tests", () => {
    it("rejects an empty string name (zero-length)", () => {
      const result = sprintCreateSchema.safeParse({ ...validCreate, name: "" });
      expect(result.success).toBe(false);
    });

    it("accepts a single-character name (minimum valid length)", () => {
      const result = sprintCreateSchema.safeParse({ ...validCreate, name: "A" });
      expect(result.success).toBe(true);
    });

    it("accepts a long name", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        name: "A very long sprint name with many words and special chars: #1!",
      });
      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Date ordering
  // -------------------------------------------------------------------------

  describe("date ordering", () => {
    it("rejects when endDate is before startDate", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        endDate: BEFORE_START,
      });
      expect(result.success).toBe(false);
    });

    it("includes a descriptive error message on the endDate field", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        endDate: BEFORE_START,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const endDateError = result.error.errors.find(
          (e) => e.path[0] === "endDate"
        );
        expect(endDateError).toBeDefined();
        expect(endDateError?.message).toMatch(/endDate must be greater than or equal to startDate/i);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Status validation
  // -------------------------------------------------------------------------

  describe("status field", () => {
    it("accepts a missing status (field is optional)", () => {
      const result = sprintCreateSchema.safeParse(validCreate); // no status
      expect(result.success).toBe(true);
    });

    it("rejects an invalid status value", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        status: "INVALID_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Datetime format
  // -------------------------------------------------------------------------

  describe("datetime format", () => {
    it("rejects a date-only string for startDate (not a full datetime)", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        startDate: "2026-06-01", // date-only, not ISO datetime
      });
      expect(result.success).toBe(false);
    });

    it("rejects a date-only string for endDate", () => {
      const result = sprintCreateSchema.safeParse({
        ...validCreate,
        endDate: "2026-06-14", // date-only, not ISO datetime
      });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// sprintUpdateSchema
// ---------------------------------------------------------------------------

describe("sprintUpdateSchema", () => {
  // -------------------------------------------------------------------------
  // All fields optional
  // -------------------------------------------------------------------------

  it("accepts an empty object (all fields optional)", () => {
    const result = sprintUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only name", () => {
    const result = sprintUpdateSchema.safeParse({ name: "Updated Sprint" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only status", () => {
    const result = sprintUpdateSchema.safeParse({ status: "COMPLETED" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only startDate", () => {
    const result = sprintUpdateSchema.safeParse({ startDate: START });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only endDate", () => {
    const result = sprintUpdateSchema.safeParse({ endDate: END });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Date ordering (only checked when both dates supplied)
  // -------------------------------------------------------------------------

  it("rejects when both dates are supplied and endDate is before startDate", () => {
    const result = sprintUpdateSchema.safeParse({
      startDate: START,
      endDate: BEFORE_START,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endDateError = result.error.errors.find(
        (e) => e.path[0] === "endDate"
      );
      expect(endDateError?.message).toMatch(/endDate must be greater than or equal to startDate/i);
    }
  });

  it("accepts when both dates are supplied and endDate >= startDate", () => {
    const result = sprintUpdateSchema.safeParse({
      startDate: START,
      endDate: END,
    });
    expect(result.success).toBe(true);
  });

  it("accepts when both dates equal", () => {
    const result = sprintUpdateSchema.safeParse({
      startDate: START,
      endDate: START,
    });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Name boundary (update context)
  // -------------------------------------------------------------------------

  it("rejects an empty string name in an update", () => {
    const result = sprintUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a single-character name in an update", () => {
    const result = sprintUpdateSchema.safeParse({ name: "X" });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Invalid status
  // -------------------------------------------------------------------------

  it("rejects an invalid status in an update", () => {
    const result = sprintUpdateSchema.safeParse({ status: "UNKNOWN" });
    expect(result.success).toBe(false);
  });
});
