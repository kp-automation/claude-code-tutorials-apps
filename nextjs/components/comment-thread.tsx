"use client";

import { useState } from "react";
import { Comment, User } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";

interface CommentThreadProps {
  comments: (Comment & {
    author: Pick<User, "id" | "name" | "email">;
  })[];
  taskId: string;
  onCommentAdded: () => void;
}

export function CommentThread({
  comments,
  taskId,
  onCommentAdded,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          taskId,
        }),
      });

      if (response.ok) {
        setNewComment("");
        onCommentAdded();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Comments ({comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
          {isSubmitting ? "Adding..." : "Add Comment"}
        </Button>
      </form>

      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
            </CardContent>
          </Card>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}
