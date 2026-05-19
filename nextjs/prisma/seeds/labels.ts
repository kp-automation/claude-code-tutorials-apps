import { PrismaClient } from "@prisma/client";

interface Projects {
  project1Id: string;
  project2Id: string;
}

interface Tasks {
  task1Id: string;
  task2Id: string;
  task3Id: string;
  task6Id: string;
}

export async function seedLabels(prisma: PrismaClient, { project1Id, project2Id }: Projects, { task1Id, task2Id, task3Id, task6Id }: Tasks) {
  await prisma.label.create({
    data: { name: "Bug", color: "#ef4444", projectId: project1Id },
  });

  const featureLabel = await prisma.label.create({
    data: { name: "Feature", color: "#3b82f6", projectId: project1Id },
  });

  const urgentLabel = await prisma.label.create({
    data: { name: "Urgent", color: "#f97316", projectId: project2Id },
  });

  await prisma.taskLabel.createMany({
    data: [
      { taskId: task1Id, labelId: featureLabel.id },
      { taskId: task2Id, labelId: featureLabel.id },
      { taskId: task3Id, labelId: featureLabel.id },
      { taskId: task6Id, labelId: urgentLabel.id },
    ],
  });
}
