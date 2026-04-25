"use client";

import { deleteTask } from "@/app/lib/actions/tasks";
import { ConfirmDeleteDialog } from "@/app/(app)/_components/confirm-delete-dialog";

export function DeleteTaskButton({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  return (
    <ConfirmDeleteDialog
      title="Delete task?"
      description={`Permanently remove "${taskTitle}" along with its comments, attachments, and activity history. This cannot be undone.`}
      confirmButtonLabel="Delete task"
      onConfirm={() => deleteTask(taskId)}
    >
      {(open) => (
        <button
          type="button"
          onClick={open}
          className="rounded-lg border border-destructive/40 bg-background px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
        >
          Delete task
        </button>
      )}
    </ConfirmDeleteDialog>
  );
}
