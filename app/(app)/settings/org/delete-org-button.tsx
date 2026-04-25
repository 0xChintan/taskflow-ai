"use client";

import { useState, useTransition } from "react";
import { deleteOrg } from "@/app/lib/actions/orgs";

export function DeleteOrgButton({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        Delete organization
      </button>
    );
  }

  const matches = confirmText === orgName;

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Type <span className="font-mono font-semibold">{orgName}</span> to confirm.
        This deletes all projects, tasks, comments, and files in this org.
      </p>
      <input
        autoFocus
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={orgName}
        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!matches || pending}
          onClick={() => startTransition(() => deleteOrg(orgId))}
          className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete forever"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmText("");
          }}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
