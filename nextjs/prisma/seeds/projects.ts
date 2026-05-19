import { PrismaClient } from "@prisma/client";

export async function seedProjects(prisma: PrismaClient, aliceId: string) {
  const project1 = await prisma.project.create({
    data: {
      name: "TaskForge Development",
      description: "Build the next generation project management tool",
      status: "ACTIVE",
      ownerId: aliceId,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Marketing Campaign",
      description: "Q1 2024 marketing initiatives",
      status: "ACTIVE",
      ownerId: aliceId,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Legacy System Migration",
      description: "Migrate old infrastructure to cloud",
      status: "ARCHIVED",
      ownerId: aliceId,
    },
  });

  return { project1, project2, project3 };
}
