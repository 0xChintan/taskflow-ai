"use client";

import { deleteProject } from "@/app/lib/actions/projects";
import { ConfirmDeleteDialog } from "@/app/(app)/_components/confirm-delete-dialog";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <ConfirmDeleteDialog
      title="Delete project?"
      description={`This will permanently delete "${projectName}" and all of its tasks, comments, attachments, sprints, and history. This cannot be undone.`}
      confirmText={projectName}
      confirmButtonLabel="Delete project"
      onConfirm={() => deleteProject(projectId)}
    >
      {(open) => (
        <button
          type="button"
          onClick={open}
          className="rounded-lg border border-destructive/40 bg-background px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
        >
          Delete project
        </button>
      )}
    </ConfirmDeleteDialog>
  );
}
