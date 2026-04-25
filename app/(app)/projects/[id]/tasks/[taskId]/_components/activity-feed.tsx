import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
} from "@/app/(app)/projects/[id]/_components/labels";
import { CommentForm } from "./comment-form";
import { CommentItem, type CommentItemData } from "./comment-item";

type FeedEntry =
  | { kind: "comment"; at: Date; data: CommentItemData }
  | { kind: "activity"; at: Date; action: string; meta: unknown; actor: string };

function timeAgo(d: Date) {
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function describe(action: string, meta: any): string {
  switch (action) {
    case "task.created":
      return "created this task";
    case "task.deleted":
      return "deleted this task";
    case "task.status_changed":
      return `changed status from ${STATUS_LABEL[meta?.from as TaskStatus] ?? meta?.from} to ${STATUS_LABEL[meta?.to as TaskStatus] ?? meta?.to}`;
    case "task.priority_changed":
      return `set priority to ${PRIORITY_LABEL[meta?.to as Priority] ?? meta?.to}`;
    case "task.assignee_changed":
      if (meta?.to && meta?.from) return `reassigned from ${meta.from} to ${meta.to}`;
      if (meta?.to) return `assigned to ${meta.to}`;
      return "unassigned";
    case "task.edited": {
      const fields: string[] = meta?.fields ?? [];
      return `edited ${fields.join(" and ")}`;
    }
    case "comment.added":
      return "commented";
    default:
      return action;
  }
}

export async function ActivityFeed({
  taskId,
  currentUserId,
}: {
  taskId: string;
  currentUserId: string;
}) {
  const [comments, activities] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        editedAt: true,
        user: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            size: true,
            uploaderId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activityLog.findMany({
      where: { taskId, action: { not: "comment.added" } },
      select: {
        id: true,
        action: true,
        meta: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const entries: FeedEntry[] = [
    ...comments.map<FeedEntry>((c) => ({
      kind: "comment",
      at: c.createdAt,
      data: {
        id: c.id,
        body: c.body,
        authorName: c.user.name,
        authorId: c.user.id,
        createdAt: c.createdAt,
        editedAt: c.editedAt,
        attachments: c.attachments,
      },
    })),
    ...activities.map<FeedEntry>((a) => ({
      kind: "activity",
      at: a.createdAt,
      action: a.action,
      meta: a.meta,
      actor: a.user.name,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">Activity</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e, i) =>
            e.kind === "comment" ? (
              <li key={`c-${e.data.id}`}>
                <CommentItem comment={e.data} currentUserId={currentUserId} />
              </li>
            ) : (
              <li
                key={`a-${i}`}
                className="text-xs text-muted-foreground pl-3 border-l-2 border-border"
              >
                <span className="font-medium text-foreground">{e.actor}</span>{" "}
                {describe(e.action, e.meta)} · {timeAgo(e.at)}
              </li>
            ),
          )}
        </ul>
      )}
      <CommentForm taskId={taskId} />
    </div>
  );
}
