import { prisma } from "@/lib/db";

export async function getSprintsByProject(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSprintById(id: string) {
  return prisma.sprint.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, ownerId: true },
      },
      tasks: true,
    },
  });
}

export async function createSprint(data: {
  name: string;
  startDate: Date;
  endDate: Date;
  projectId: string;
  status?: string;
}) {
  return prisma.sprint.create({
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? "PLANNING",
      projectId: data.projectId,
    },
  });
}

export async function updateSprint(
  id: string,
  data: Partial<{ name: string; startDate: Date; endDate: Date; status: string }>
) {
  return prisma.sprint.update({
    where: { id },
    data,
  });
}

export async function deleteSprint(id: string) {
  return prisma.sprint.delete({ where: { id } });
}
