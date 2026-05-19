import { PrismaClient } from "@prisma/client";

interface Projects {
  project1Id: string;
  project2Id: string;
}

interface Users {
  aliceId: string;
  bobId: string;
  charlieId: string;
}

export async function seedTasks(prisma: PrismaClient, { project1Id, project2Id }: Projects, { aliceId, bobId, charlieId }: Users) {
  const task1 = await prisma.task.create({
    data: {
      title: "Setup authentication system",
      description: "Implement NextAuth.js with credentials provider",
      status: "DONE",
      priority: "HIGH",
      projectId: project1Id,
      assigneeId: aliceId,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Design database schema",
      description: "Create Prisma schema for all models",
      status: "DONE",
      priority: "URGENT",
      projectId: project1Id,
      assigneeId: aliceId,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Build task board UI",
      description: "Create Kanban board with drag and drop",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project1Id,
      assigneeId: bobId,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Add comment functionality",
      description: "Allow users to comment on tasks",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project1Id,
      assigneeId: bobId,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Implement project archiving",
      description: "Add ability to archive completed projects",
      status: "TODO",
      priority: "LOW",
      projectId: project1Id,
    },
  });

  const task6 = await prisma.task.create({
    data: {
      title: "Social media strategy",
      description: "Develop comprehensive social media plan",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project2Id,
      assigneeId: bobId,
    },
  });

  const task7 = await prisma.task.create({
    data: {
      title: "Email campaign design",
      description: "Create email templates for campaign",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project2Id,
    },
  });

  const task8 = await prisma.task.create({
    data: {
      title: "Analytics dashboard setup",
      description: "Configure tracking and analytics",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project2Id,
      assigneeId: charlieId,
    },
  });

  return { task1, task2, task3, task4, task5, task6, task7, task8 };
}
