"use client";

import { useTransition } from "react";
import {
  completeSprint,
  deleteSprint,
  startSprint,
} from "@/app/lib/actions/sprints";

type SprintData = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  taskCount: number;
};

export function SprintRow({ sprint }: { sprint: SprintData }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{sprint.name}</span>
            {sprint.isActive && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                ACTIVE
              </span>
            )}
          </div>
          {sprint.goal && (
            <p className="mt-1 text-sm text-muted-foreground">{sprint.goal}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {sprint.startDate} → {sprint.endDate} · {sprint.taskCount} {sprint.taskCount === 1 ? "task" : "tasks"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          {sprint.isActive ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => completeSprint(sprint.id))}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {pending ? "…" : "Complete"}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => startSprint(sprint.id))}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {pending ? "…" : "Start"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete sprint "${sprint.name}"? Tasks remain in the project.`)) {
                startTransition(() => deleteSprint(sprint.id));
              }
            }}
            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
