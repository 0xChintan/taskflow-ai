"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Priority } from "@prisma/client";
import { PRIORITY_CLASS, PRIORITY_LABEL } from "./labels";

export type TaskCardData = {
  id: string;
  number: number;
  title: string;
  priority: Priority;
  assignee: { id: string; name: string } | null;
  sprint: { name: string; isActive: boolean } | null;
};

export function TaskCard({
  task,
  projectId,
  projectKey,
}: {
  task: TaskCardData;
  projectId: string;
  projectKey: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none rounded-md border border-border bg-background p-3 shadow-sm hover:border-foreground/20 cursor-grab active:cursor-grabbing"
    >
      <Link
        href={`/projects/${projectId}/tasks/${task.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="block text-sm font-medium leading-snug hover:underline"
      >
        {task.title}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono shrink-0">
            {projectKey}-{task.number}
          </span>
          {task.sprint && (
            <span
              title={task.sprint.isActive ? `${task.sprint.name} (active sprint)` : task.sprint.name}
              className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                task.sprint.isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {task.sprint.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.priority !== Priority.NONE && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_CLASS[task.priority]}`}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
          {task.assignee && (
            <span
              title={task.assignee.name}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
            >
              {task.assignee.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
