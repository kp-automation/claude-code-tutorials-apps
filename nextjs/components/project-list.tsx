"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Project, Task, User } from "@prisma/client";
import { Folder, Archive } from "lucide-react";
import Link from "next/link";

interface ProjectListProps {
  projects: (Project & {
    tasks: Task[];
    owner: Pick<User, "id" | "name" | "email">;
  })[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        const taskCounts = {
          todo: project.tasks.filter((t) => t.status === "TODO").length,
          inProgress: project.tasks.filter((t) => t.status === "IN_PROGRESS").length,
          done: project.tasks.filter((t) => t.status === "DONE").length,
        };

        return (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {project.status === "ARCHIVED" ? (
                      <Archive className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Folder className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">To Do: </span>
                    <span className="font-medium">{taskCounts.todo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Progress: </span>
                    <span className="font-medium">{taskCounts.inProgress}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Done: </span>
                    <span className="font-medium">{taskCounts.done}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
