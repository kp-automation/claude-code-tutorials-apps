import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sprintCreateSchema } from "@/lib/sprint-validation";
import { getSprintsByProject, createSprint } from "@/lib/sprint-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { projectId } = req.query;

      if (!projectId || typeof projectId !== "string") {
        return res.status(400).json({ error: "projectId query parameter is required" });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (project.ownerId !== (session.user as any).id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const sprints = await getSprintsByProject(projectId);
      return res.status(200).json(sprints);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = sprintCreateSchema.parse(req.body);

      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (project.ownerId !== (session.user as any).id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const sprint = await createSprint({
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
        projectId: data.projectId,
      });

      return res.status(201).json(sprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end();
}
