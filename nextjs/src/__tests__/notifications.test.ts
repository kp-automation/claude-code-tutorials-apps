import {
  parseMentions,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMentions,
} from "@/lib/notifications";

jest.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      create: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const mockNotificationCreate = prisma.notification.create as jest.Mock;
const mockTaskFindUnique = prisma.task.findUnique as jest.Mock;
const mockUserFindMany = prisma.user.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockNotificationCreate.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// parseMentions
// ---------------------------------------------------------------------------

describe("parseMentions", () => {
  it("returns empty array for empty string", () => {
    expect(parseMentions("")).toEqual([]);
  });

  it("returns empty array when no @ symbols are present", () => {
    expect(parseMentions("plain text with no handles")).toEqual([]);
  });

  it("extracts a single mention", () => {
    expect(parseMentions("hey @alice can you review?")).toEqual(["alice"]);
  });

  it("extracts multiple distinct mentions", () => {
    expect(parseMentions("@alice and @bob should look at this")).toEqual([
      "alice",
      "bob",
    ]);
  });

  it("lowercases all extracted handles", () => {
    expect(parseMentions("cc @Alice @BOB @Charlie")).toEqual([
      "alice",
      "bob",
      "charlie",
    ]);
  });

  it("returns both occurrences when the same handle appears twice", () => {
    expect(parseMentions("@alice hey @alice")).toEqual(["alice", "alice"]);
  });

  it("handles mentions containing underscores", () => {
    expect(parseMentions("thanks @alice_smith")).toEqual(["alice_smith"]);
  });

  it("handles mentions containing digits", () => {
    expect(parseMentions("@user123 is on it")).toEqual(["user123"]);
  });

  it("extracts a mention at the very start of the string", () => {
    expect(parseMentions("@alice great work")).toEqual(["alice"]);
  });

  it("extracts a mention at the very end of the string", () => {
    expect(parseMentions("great work @alice")).toEqual(["alice"]);
  });

  it("handles a string that is only a mention", () => {
    expect(parseMentions("@alice")).toEqual(["alice"]);
  });

  it("does not match an @ with no following word characters", () => {
    expect(parseMentions("email me @ the office")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// notifyTaskAssigned
// ---------------------------------------------------------------------------

describe("notifyTaskAssigned", () => {
  const BASE = { actorId: "actor-1", taskId: "task-1" };

  it("does nothing when assigneeId is null", async () => {
    await notifyTaskAssigned({ ...BASE, assigneeId: null });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("does nothing when assigneeId is undefined", async () => {
    await notifyTaskAssigned({ ...BASE, assigneeId: undefined });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("does nothing when the assignee is the same user as the actor (self-assignment)", async () => {
    await notifyTaskAssigned({ ...BASE, assigneeId: "actor-1" });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("creates a TASK_ASSIGNED notification for a different assignee", async () => {
    await notifyTaskAssigned({ ...BASE, assigneeId: "assignee-2" });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "assignee-2",
        actorId: "actor-1",
        type: "TASK_ASSIGNED",
        taskId: "task-1",
        commentId: null,
      },
    });
  });

  it("is best-effort: resolves without throwing when prisma rejects", async () => {
    mockNotificationCreate.mockRejectedValueOnce(new Error("db error"));
    await expect(
      notifyTaskAssigned({ ...BASE, assigneeId: "assignee-2" })
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// notifyTaskCompleted
// ---------------------------------------------------------------------------

describe("notifyTaskCompleted", () => {
  const BASE = { actorId: "actor-1", taskId: "task-1" };

  it("does nothing when the task does not exist", async () => {
    mockTaskFindUnique.mockResolvedValueOnce(null);
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("does nothing when actor is the only recipient (no assignee, actor owns project)", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: null,
      project: { ownerId: "actor-1" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("notifies only the assignee when the project owner is the actor", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "assignee-2",
      project: { ownerId: "actor-1" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "assignee-2",
        actorId: "actor-1",
        type: "TASK_COMPLETED",
        taskId: "task-1",
        commentId: null,
      },
    });
  });

  it("notifies only the project owner when the assignee is the actor", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "actor-1",
      project: { ownerId: "owner-3" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "owner-3",
        actorId: "actor-1",
        type: "TASK_COMPLETED",
        taskId: "task-1",
        commentId: null,
      },
    });
  });

  it("notifies both assignee and owner when both differ from actor", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "assignee-2",
      project: { ownerId: "owner-3" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(2);
    const notifiedIds = mockNotificationCreate.mock.calls.map(
      (c) => c[0].data.userId
    );
    expect(notifiedIds).toContain("assignee-2");
    expect(notifiedIds).toContain("owner-3");
  });

  it("sends only one notification when assignee and owner are the same non-actor user", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "user-2",
      project: { ownerId: "user-2" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate.mock.calls[0][0].data.userId).toBe("user-2");
  });

  it("does nothing when both assignee and owner are the actor", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "actor-1",
      project: { ownerId: "actor-1" },
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("still notifies the assignee when the task has no project", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: "assignee-2",
      project: null,
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate.mock.calls[0][0].data.userId).toBe(
      "assignee-2"
    );
  });

  it("does nothing when task has no assignee and no project", async () => {
    mockTaskFindUnique.mockResolvedValueOnce({
      assigneeId: null,
      project: null,
    });
    await notifyTaskCompleted(BASE);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("is best-effort: resolves without throwing when prisma.task.findUnique rejects", async () => {
    mockTaskFindUnique.mockRejectedValueOnce(new Error("db error"));
    await expect(notifyTaskCompleted(BASE)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// notifyMentions
// ---------------------------------------------------------------------------

describe("notifyMentions", () => {
  const BASE = {
    actorId: "actor-1",
    taskId: "task-1",
    commentId: "comment-1",
  };

  it("does nothing when body contains no mentions", async () => {
    await notifyMentions({ ...BASE, body: "no handles here" });
    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("queries for users excluding the actor", async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    await notifyMentions({ ...BASE, body: "@alice" });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { id: "actor-1" } }),
      })
    );
  });

  it("does nothing when no database users match the mentioned handles", async () => {
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "Bob" }]);
    await notifyMentions({ ...BASE, body: "@alice" });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("creates a MENTION notification for a matched user", async () => {
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "Alice" }]);
    await notifyMentions({ ...BASE, body: "hey @alice" });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        actorId: "actor-1",
        type: "MENTION",
        taskId: "task-1",
        commentId: "comment-1",
      },
    });
  });

  it("creates notifications for each matched user when multiple are mentioned", async () => {
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-2", name: "Alice" },
      { id: "user-3", name: "Bob" },
    ]);
    await notifyMentions({ ...BASE, body: "@alice and @bob please review" });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(2);
  });

  it("matches mentions case-insensitively against user names", async () => {
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "ALICE" }]);
    await notifyMentions({ ...BASE, body: "@alice" });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it("notifies a user only once even when the same handle appears multiple times", async () => {
    // parseMentions returns ["alice","alice"] but Set(names) deduplicates for the filter,
    // so the user appears in the candidates list once and gets one notification.
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "Alice" }]);
    await notifyMentions({ ...BASE, body: "@alice hey @alice again" });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it("does not notify a user whose name only partially matches a handle", async () => {
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "Ali" }]);
    await notifyMentions({ ...BASE, body: "@alice" });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("is best-effort: resolves without throwing when prisma.user.findMany rejects", async () => {
    mockUserFindMany.mockRejectedValueOnce(new Error("db error"));
    await expect(
      notifyMentions({ ...BASE, body: "@alice" })
    ).resolves.toBeUndefined();
  });

  it("is best-effort: resolves without throwing when prisma.notification.create rejects", async () => {
    mockUserFindMany.mockResolvedValueOnce([{ id: "user-2", name: "Alice" }]);
    mockNotificationCreate.mockRejectedValueOnce(new Error("db error"));
    await expect(
      notifyMentions({ ...BASE, body: "@alice" })
    ).resolves.toBeUndefined();
  });
});
