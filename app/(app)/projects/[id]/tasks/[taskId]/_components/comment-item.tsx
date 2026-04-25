"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteComment, updateComment } from "@/app/lib/actions/comments";
import { AttachmentList, type AttachmentData } from "./attachment-list";
import { ConfirmDeleteDialog } from "@/app/(app)/_components/confirm-delete-dialog";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type CommentItemData = {
  id: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAt: Date;
  editedAt: Date | null;
  attachments: AttachmentData[];
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
      <span
        key={i++}
        className="rounded bg-primary/10 px-1 text-primary font-medium"
      >
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

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle border border-border text-xs font-medium">
          {comment.authorName.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-background p-3 shadow-xs">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium">{comment.authorName}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {timeAgo(comment.createdAt)}
              {comment.editedAt && (
                <span className="ml-1 italic">(edited)</span>
              )}
            </span>
          </div>
          {isMine && !editing && (
            <div className="flex items-center gap-1 text-xs">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground hover:bg-subtle px-1.5 py-0.5 rounded transition"
                >
                  Edit
                </button>
              )}
              <ConfirmDeleteDialog
                title="Delete comment?"
                description="This comment will be permanently removed. This cannot be undone."
                confirmButtonLabel="Delete comment"
                onConfirm={() => deleteComment(comment.id)}
              >
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-1.5 py-0.5 rounded transition"
                  >
                    Delete
                  </button>
                )}
              </ConfirmDeleteDialog>
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
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {renderBody(comment.body)}
            </div>
            {comment.attachments.length > 0 && (
              <div className="mt-3">
                <AttachmentList
                  attachments={comment.attachments}
                  currentUserId={currentUserId}
                  layout="grid"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
