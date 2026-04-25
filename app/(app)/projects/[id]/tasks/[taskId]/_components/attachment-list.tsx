"use client";

import { useTransition } from "react";
import { deleteAttachment } from "@/app/lib/actions/attachments";

export type AttachmentData = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploaderId: string;
};

function isImage(m: string) {
  return m.startsWith("image/");
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  currentUserId,
  layout = "grid",
}: {
  attachments: AttachmentData[];
  currentUserId: string;
  layout?: "grid" | "inline";
}) {
  if (attachments.length === 0) return null;

  return (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
          : "flex flex-wrap gap-2"
      }
    >
      {attachments.map((a) => (
        <AttachmentTile key={a.id} attachment={a} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

function AttachmentTile({
  attachment,
  currentUserId,
}: {
  attachment: AttachmentData;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const canDelete = attachment.uploaderId === currentUserId;

  return (
    <div className="group relative rounded-md border border-border bg-background overflow-hidden">
      {isImage(attachment.mimeType) ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="aspect-video w-full object-cover"
          />
          <div className="px-2 py-1.5 text-xs">
            <div className="truncate">{attachment.filename}</div>
            <div className="text-muted-foreground">{formatBytes(attachment.size)}</div>
          </div>
        </a>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          download={attachment.filename}
          className="flex items-start gap-2 p-3 text-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="min-w-0">
            <div className="truncate font-medium">{attachment.filename}</div>
            <div className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</div>
          </div>
        </a>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete ${attachment.filename}?`)) {
              startTransition(() => deleteAttachment(attachment.id));
            }
          }}
          className="absolute top-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
          aria-label={`Delete ${attachment.filename}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
