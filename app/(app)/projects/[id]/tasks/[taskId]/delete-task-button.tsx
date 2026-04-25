"use client";

import { useTransition } from "react";
import { deleteTask } from "@/app/lib/actions/tasks";

export function DeleteTaskButton({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete task "${taskTitle}"? This cannot be undone.`)) {
          startTransition(() => deleteTask(taskId));
        }
      }}
      className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete task"}
    </button>
  );
}
