import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project exists and is owned by the caller — returns 404 for both
    // "not found" and "not owner" to prevent project enumeration.
    const project = await prisma.project.findUnique({
      where: { id, ownerId: (session.user as any).id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Aggregate time entries grouped by user
    const grouped = await prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { task: { projectId: id } },
      _sum: { durationSeconds: true },
      _count: { id: true },
    });

    if (grouped.length === 0) {
      return NextResponse.json([]);
    }

    // Resolve user names and emails in a second query
    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const report = grouped.map((g) => {
      const user = userMap.get(g.userId);
      return {
        userId: g.userId,
        userName: user?.name ?? "",
        userEmail: user?.email ?? "",
        totalSeconds: g._sum.durationSeconds ?? 0,
        entryCount: g._count.id,
      };
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
