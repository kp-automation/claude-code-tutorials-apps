"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentThread } from "@/components/comment-thread";
import { TimeTracking } from "@/components/time-tracking";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { getTask, updateTask, deleteTask } from "@/src/lib/api/tasks";
import type { TaskStatus, Priority } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [params.taskId]);

  const fetchTask = async () => {
    try {
      const data = await getTask(params.taskId as string);
      setTask(data);
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { status: newStatus as TaskStatus });
      fetchTask();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { priority: newPriority as Priority });
      fetchTask();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(params.taskId as string);
      router.push(`/projects/${params.id}`);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading task...</div>;
  }

  if (!task) {
    return <div className="text-center py-12">Task not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/projects/${params.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <p className="text-muted-foreground mt-1">{task.project.name}</p>
          </div>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {task.description || "No description provided"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <CommentThread
                comments={task.comments}
                taskId={params.taskId as string}
                onCommentAdded={fetchTask}
              />
            </CardContent>
          </Card>

          <TimeTracking taskId={params.taskId as string} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select
                  value={task.priority}
                  onValueChange={handlePriorityChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Assignee</label>
                <p className="text-sm text-muted-foreground">
                  {task.assignee?.name || "Unassigned"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Created</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Updated</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
