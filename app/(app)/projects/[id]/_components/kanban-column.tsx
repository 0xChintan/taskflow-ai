"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskStatus } from "@prisma/client";
import { TaskCard, type TaskCardData } from "./task-card";
import { QuickCreate } from "./quick-create";

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
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[60px] flex-col gap-2 rounded-md p-1 transition-colors ${
            isOver ? "bg-primary/5" : ""
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
      <QuickCreate projectId={projectId} status={status} />
    </div>
  );
}
