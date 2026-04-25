"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteComment, updateComment } from "@/app/lib/actions/comments";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type CommentItemData = {
  id: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAt: Date;
  editedAt: Date | null;
};

function renderBody(body: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(@[a-zA-Z][\w.-]{1,29})/g;
  let last = 0;
  let i = 0;
  for (const m of body.matchAll(re)) {
    const idx = m.index!;
    if (idx > last) parts.push(body.slice(last, idx));
    parts.push(
      <span key={i++} className="rounded bg-primary/10 px-1 text-primary font-medium">
        {m[1]}
      </span>,
    );
    last = idx + m[1].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts.length ? parts : body;
}

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

export function CommentItem({
  comment,
  currentUserId,
}: {
  comment: CommentItemData;
  currentUserId: string;
}) {
  const isMine = comment.authorId === currentUserId;
  const canEdit = isMine && Date.now() - comment.createdAt.getTime() <= EDIT_WINDOW_MS;
  const [editing, setEditing] = useState(false);
  const action = updateComment.bind(null, comment.id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">{comment.authorName}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {timeAgo(comment.createdAt)}
            {comment.editedAt && " · edited"}
          </span>
        </div>
        {isMine && !editing && (
          <div className="flex items-center gap-3 text-xs">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              disabled={deletePending}
              onClick={() => {
                if (confirm("Delete this comment?")) {
                  startDelete(() => deleteComment(comment.id));
                }
              }}
              className="text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="mt-2 space-y-2">
          <textarea
            name="body"
            required
            defaultValue={comment.body}
            rows={3}
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {state?.errors?.body && (
            <p className="text-xs text-destructive">{state.errors.body[0]}</p>
          )}
          {state?.errors?.form && (
            <p className="text-xs text-destructive">{state.errors.form[0]}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-1 whitespace-pre-wrap text-sm">{renderBody(comment.body)}</div>
      )}
    </div>
  );
}
