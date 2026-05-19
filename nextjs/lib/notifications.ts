import { prisma } from "@/lib/db";
import type { NotificationType } from "@/lib/types";

const MENTION_RE = /@([A-Za-z0-9_]+)/g;

export function parseMentions(body: string): string[] {
  const matches = body?.matchAll(MENTION_RE);
  if (!matches) return [];
  const names: string[] = [];
  for (const m of matches) names.push(m[1].toLowerCase());
  return names;
}

async function _create(args: {
  userId: string;
  actorId: string;
  type: NotificationType;
  taskId?: string | null;
  commentId?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        actorId: args.actorId,
        type: args.type,
        taskId: args.taskId ?? null,
        commentId: args.commentId ?? null,
      },
    });
  } catch {
    // best-effort
  }
}

export async function notifyTaskAssigned(args: {
  actorId: string;
  taskId: string;
  assigneeId: string | null | undefined;
}): Promise<void> {
  if (!args.assigneeId || args.assigneeId === args.actorId) return;
  await _create({
    userId: args.assigneeId,
    actorId: args.actorId,
    type: "TASK_ASSIGNED",
    taskId: args.taskId,
  });
}

export async function notifyTaskCompleted(args: {
  actorId: string;
  taskId: string;
}): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: args.taskId },
      select: { assigneeId: true, project: { select: { ownerId: true } } },
    });
    if (!task) return;
    const recipients = new Set<string>();
    if (task.assigneeId) recipients.add(task.assigneeId);
    if (task.project?.ownerId) recipients.add(task.project.ownerId);
    recipients.delete(args.actorId);
    for (const userId of recipients) {
      await _create({
        userId,
        actorId: args.actorId,
        type: "TASK_COMPLETED",
        taskId: args.taskId,
      });
    }
  } catch {
    // best-effort
  }
}

export async function notifyMentions(args: {
  actorId: string;
  body: string;
  taskId: string;
  commentId: string;
}): Promise<void> {
  const names = parseMentions(args.body);
  if (names.length === 0) return;
  const wanted = new Set(names);
  try {
    const candidates = await prisma.user.findMany({
      where: {
        NOT: { id: args.actorId },
        OR: names.map((n) => ({ name: { contains: n } })),
      },
      select: { id: true, name: true },
    });
    const users = candidates.filter((u) => wanted.has(u.name.toLowerCase()));
    await Promise.all(
      users.map((u) =>
        _create({
          userId: u.id,
          actorId: args.actorId,
          type: "MENTION",
          taskId: args.taskId,
          commentId: args.commentId,
        })
      )
    );
  } catch {
    // best-effort
  }
}
