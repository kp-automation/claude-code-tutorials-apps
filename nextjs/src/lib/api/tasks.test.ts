import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  ApiError,
  type TaskResponse,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "./tasks";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockTask: TaskResponse = {
  id: "task-1",
  title: "Fix bug",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  projectId: "proj-1",
  assigneeId: null,
  dueDate: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  assignee: null,
  project: { id: "proj-1", name: "Alpha" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Return plain objects that satisfy the shape `request()` reads from a Response.
// jsdom does not expose `Response` as a global, so we avoid `new Response(...)`.

function ok(body: unknown): { ok: true; status: number; json: () => Promise<unknown> } {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function err(
  status: number,
  body: unknown = {},
): { ok: false; status: number; json: () => Promise<unknown> } {
  return { ok: false, status, json: () => Promise.resolve(body) };
}

function errBadJson(status: number): { ok: false; status: number; json: () => Promise<never> } {
  return { ok: false, status, json: () => Promise.reject(new SyntaxError("Unexpected token")) };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// getTasks
// ---------------------------------------------------------------------------

describe("getTasks", () => {
  it("GETs /api/tasks and returns the parsed array", async () => {
    fetchMock.mockResolvedValue(ok([mockTask]));

    const result = await getTasks();

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", undefined);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockTask);
  });

  it("appends projectId as a query param when provided", async () => {
    fetchMock.mockResolvedValue(ok([]));

    await getTasks({ projectId: "proj-1" });

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks?projectId=proj-1", undefined);
  });

  it("encodes special characters in projectId", async () => {
    fetchMock.mockResolvedValue(ok([]));

    await getTasks({ projectId: "proj 1&2" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks?projectId=proj%201%262",
      undefined,
    );
  });

  it("omits the query string when projectId is not provided", async () => {
    fetchMock.mockResolvedValue(ok([]));

    await getTasks({});

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", undefined);
  });

  it("throws ApiError(401) on unauthorized response", async () => {
    fetchMock.mockResolvedValue(err(401, { error: "Unauthorized" }));

    await expect(getTasks()).rejects.toThrow(ApiError);
    await expect(getTasks()).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
  });

  it("throws ApiError(500) on server error", async () => {
    fetchMock.mockResolvedValue(err(500, { error: "Internal server error" }));

    await expect(getTasks()).rejects.toMatchObject({
      status: 500,
      message: "Internal server error",
    });
  });
});

// ---------------------------------------------------------------------------
// getTask
// ---------------------------------------------------------------------------

describe("getTask", () => {
  it("GETs /api/tasks/:id and returns the parsed task", async () => {
    fetchMock.mockResolvedValue(ok(mockTask));

    const result = await getTask("task-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-1", undefined);
    expect(result).toEqual(mockTask);
  });

  it("throws ApiError(404) when task is not found", async () => {
    fetchMock.mockResolvedValue(err(404, { error: "Task not found" }));

    await expect(getTask("missing")).rejects.toMatchObject({
      status: 404,
      message: "Task not found",
    });
  });
});

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe("createTask", () => {
  const input: CreateTaskInput = {
    title: "New task",
    projectId: "proj-1",
    description: "Some description",
    priority: "HIGH",
  };

  it("POSTs to /api/tasks with JSON body and returns created task", async () => {
    fetchMock.mockResolvedValue(ok(mockTask));

    const result = await createTask(input);

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    expect(result).toEqual(mockTask);
  });

  it("serializes optional fields when provided", async () => {
    fetchMock.mockResolvedValue(ok(mockTask));
    const withOptionals: CreateTaskInput = {
      ...input,
      assigneeId: "user-2",
      dueDate: "2024-06-01T00:00:00.000Z",
      status: "IN_PROGRESS",
    };

    await createTask(withOptionals);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.assigneeId).toBe("user-2");
    expect(body.dueDate).toBe("2024-06-01T00:00:00.000Z");
    expect(body.status).toBe("IN_PROGRESS");
  });

  it("throws ApiError(400) on validation failure", async () => {
    fetchMock.mockResolvedValue(err(400, { error: "title is required" }));

    await expect(createTask(input)).rejects.toMatchObject({
      status: 400,
      message: "title is required",
    });
  });
});

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe("updateTask", () => {
  const patch: UpdateTaskInput = { status: "IN_PROGRESS" };

  it("PATCHes /api/tasks/:id with JSON body and returns updated task", async () => {
    const updated = { ...mockTask, status: "IN_PROGRESS" as const };
    fetchMock.mockResolvedValue(ok(updated));

    const result = await updateTask("task-1", patch);

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("sends only the provided fields in the body", async () => {
    fetchMock.mockResolvedValue(ok(mockTask));

    await updateTask("task-1", { priority: "URGENT" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ priority: "URGENT" });
    expect(body).not.toHaveProperty("title");
    expect(body).not.toHaveProperty("status");
  });

  it("throws ApiError(404) when task is not found", async () => {
    fetchMock.mockResolvedValue(err(404, { error: "Task not found" }));

    await expect(updateTask("missing", patch)).rejects.toMatchObject({
      status: 404,
      message: "Task not found",
    });
  });

  it("throws ApiError(400) on invalid field value", async () => {
    fetchMock.mockResolvedValue(err(400, { error: "Invalid status" }));

    await expect(updateTask("task-1", patch)).rejects.toMatchObject({
      status: 400,
    });
  });
});

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe("deleteTask", () => {
  it("DELETEs /api/tasks/:id and returns { success: true }", async () => {
    fetchMock.mockResolvedValue(ok({ success: true }));

    const result = await deleteTask("task-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-1", {
      method: "DELETE",
    });
    expect(result).toEqual({ success: true });
  });

  it("throws ApiError(404) when task is not found", async () => {
    fetchMock.mockResolvedValue(err(404, { error: "Task not found" }));

    await expect(deleteTask("missing")).rejects.toMatchObject({
      status: 404,
      message: "Task not found",
    });
  });
});

// ---------------------------------------------------------------------------
// ApiError — error handling behaviour
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("uses body.error as the message when it is a string", async () => {
    fetchMock.mockResolvedValue(err(403, { error: "Forbidden" }));

    try {
      await getTask("task-1");
      fail("expected ApiError to be thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe("Forbidden");
      expect((e as ApiError).status).toBe(403);
    }
  });

  it("falls back to a generic message when body.error is not a string", async () => {
    fetchMock.mockResolvedValue(err(422, { error: ["field required"] }));

    await expect(getTask("task-1")).rejects.toMatchObject({
      status: 422,
      message: "Request failed with status 422",
    });
  });

  it("falls back to a generic message when the error body is not valid JSON", async () => {
    fetchMock.mockResolvedValue(errBadJson(500));

    await expect(getTask("task-1")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("falls back to a generic message when body has no error field", async () => {
    fetchMock.mockResolvedValue(err(502, {}));

    await expect(getTask("task-1")).rejects.toMatchObject({
      status: 502,
      message: "Request failed with status 502",
    });
  });

  it("has name 'ApiError'", async () => {
    fetchMock.mockResolvedValue(err(500, {}));

    await expect(getTask("task-1")).rejects.toMatchObject({ name: "ApiError" });
  });

  it("is an instance of Error", async () => {
    fetchMock.mockResolvedValue(err(500, {}));

    try {
      await getTask("task-1");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// Base URL from NEXT_PUBLIC_API_URL
// ---------------------------------------------------------------------------

describe("NEXT_PUBLIC_API_URL", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.example.com";
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    jest.resetModules();
  });

  it("prepends the env var to every request URL", async () => {
    const { getTasks: freshGetTasks } = await import("./tasks");
    const localFetch = jest.fn().mockResolvedValue(ok([]));
    global.fetch = localFetch as unknown as typeof fetch;

    await freshGetTasks();

    expect(localFetch).toHaveBeenCalledWith(
      "http://api.example.com/api/tasks",
      undefined,
    );
  });

  it("defaults to relative URLs when env var is absent", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { getTask: freshGetTask } = await import("./tasks");
    const localFetch = jest.fn().mockResolvedValue(ok(mockTask));
    global.fetch = localFetch as unknown as typeof fetch;

    await freshGetTask("task-1");

    expect(localFetch).toHaveBeenCalledWith("/api/tasks/task-1", undefined);
  });
});
