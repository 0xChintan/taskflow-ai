"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskStatus } from "@prisma/client";
import { TaskCard, type TaskCardData } from "./task-card";

export function KanbanColumn({
  status,
  label,
  tasks,
  projectId,
  projectKey,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskCardData[];
  projectId: string;
  projectKey: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/60 border border-border p-2.5 min-h-[200px]">
      <div className="flex items-center justify-between px-1.5 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="rounded-full bg-background border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[60px] flex-col gap-2 rounded-md p-0.5 transition-colors ${
            isOver ? "bg-primary/10" : ""
          }`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              projectKey={projectKey}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
