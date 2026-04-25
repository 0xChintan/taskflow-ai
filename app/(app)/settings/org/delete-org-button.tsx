"use client";

import { deleteOrg } from "@/app/lib/actions/orgs";
import { ConfirmDeleteDialog } from "@/app/(app)/_components/confirm-delete-dialog";

export function DeleteOrgButton({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  return (
    <ConfirmDeleteDialog
      title="Delete organization?"
      description={`This will permanently delete "${orgName}" and everything inside it — projects, tasks, comments, attachments, and all member records. This cannot be undone.`}
      confirmText={orgName}
      confirmButtonLabel="Delete organization"
      onConfirm={() => deleteOrg(orgId)}
    >
      {(open) => (
        <button
          type="button"
          onClick={open}
          className="rounded-lg border border-destructive/40 bg-background px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
        >
          Delete organization
        </button>
      )}
    </ConfirmDeleteDialog>
  );
}
