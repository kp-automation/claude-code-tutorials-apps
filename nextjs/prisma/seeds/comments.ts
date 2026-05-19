import { PrismaClient } from "@prisma/client";

interface Tasks {
  task1Id: string;
  task3Id: string;
  task6Id: string;
}

interface Users {
  aliceId: string;
  bobId: string;
}

export async function seedComments(prisma: PrismaClient, { task1Id, task3Id, task6Id }: Tasks, { aliceId, bobId }: Users) {
  await prisma.comment.create({
    data: {
      content: "Great work on the authentication! Testing it now.",
      taskId: task1Id,
      authorId: bobId,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Thanks! Let me know if you find any issues.",
      taskId: task1Id,
      authorId: aliceId,
    },
  });

  await prisma.comment.create({
    data: {
      content: "The Kanban board is coming along nicely. Should be done by end of week.",
      taskId: task3Id,
      authorId: bobId,
    },
  });

  await prisma.comment.create({
    data: {
      content: "We need to prioritize the social media content calendar.",
      taskId: task6Id,
      authorId: aliceId,
    },
  });
}
