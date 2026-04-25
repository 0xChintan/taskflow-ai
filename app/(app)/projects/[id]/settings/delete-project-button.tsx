"use client";

import { useTransition } from "react";
import { deleteProject } from "@/app/lib/actions/projects";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(`Delete project "${projectName}"? This cannot be undone.`)
        ) {
          startTransition(() => deleteProject(projectId));
        }
      }}
      className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}
