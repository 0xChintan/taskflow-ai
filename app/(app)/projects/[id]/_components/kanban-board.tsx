"use client";

import { useOptimistic, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TaskStatus } from "@prisma/client";
import { moveTask } from "@/app/lib/actions/tasks";
import { getOrderBetween } from "@/lib/order";
import { KanbanColumn } from "./kanban-column";
import { STATUS_COLUMNS } from "./labels";
import type { TaskCardData } from "./task-card";

export type KanbanTask = TaskCardData & { status: TaskStatus; order: number };

type Move = { taskId: string; status: TaskStatus; order: number };

const COLUMN_ID_PREFIX = "column:";

function isColumnId(id: string): boolean {
  return id.startsWith(COLUMN_ID_PREFIX);
}

function statusFromColumnId(id: string): TaskStatus {
  return id.slice(COLUMN_ID_PREFIX.length) as TaskStatus;
}

function applyMove(state: KanbanTask[], move: Move): KanbanTask[] {
  return state.map((t) =>
    t.id === move.taskId ? { ...t, status: move.status, order: move.order } : t,
  );
}

function groupByStatus(tasks: KanbanTask[]): Record<TaskStatus, KanbanTask[]> {
  const groups = Object.fromEntries(
    STATUS_COLUMNS.map((c) => [c.status, [] as KanbanTask[]]),
  ) as Record<TaskStatus, KanbanTask[]>;
  for (const t of tasks) groups[t.status].push(t);
  for (const k of Object.keys(groups) as TaskStatus[]) {
    groups[k].sort((a, b) => a.order - b.order);
  }
  return groups;
}

export function KanbanBoard({
  tasks,
  projectId,
  projectKey,
}: {
  tasks: KanbanTask[];
  projectId: string;
  projectKey: string;
}) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, addOptimistic] = useOptimistic(tasks, applyMove);
  const grouped = groupByStatus(optimisticTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const dragged = optimisticTasks.find((t) => t.id === activeId);
    if (!dragged) return;

    let toStatus: TaskStatus;
    let beforeOrder: number | null = null;
    let afterOrder: number | null = null;

    if (isColumnId(overId)) {
      toStatus = statusFromColumnId(overId);
      const column = grouped[toStatus].filter((t) => t.id !== activeId);
      beforeOrder = column[column.length - 1]?.order ?? null;
      afterOrder = null;
    } else {
      const overTask = optimisticTasks.find((t) => t.id === overId);
      if (!overTask) return;
      toStatus = overTask.status;
      const column = grouped[toStatus].filter((t) => t.id !== activeId);
      const overIdx = column.findIndex((t) => t.id === overId);
      if (overIdx === -1) return;
      beforeOrder = column[overIdx - 1]?.order ?? null;
      afterOrder = column[overIdx]?.order ?? null;
    }

    const newOrder = getOrderBetween(beforeOrder, afterOrder);

    if (toStatus === dragged.status && Math.abs(newOrder - dragged.order) < 0.0001) {
      return;
    }

    startTransition(async () => {
      addOptimistic({ taskId: activeId, status: toStatus, order: newOrder });
      try {
        await moveTask({
          taskId: activeId,
          status: toStatus,
          beforeOrder,
          afterOrder,
        });
      } catch {
        // revalidatePath in the action will reset to server truth on next render
      }
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STATUS_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={grouped[col.status]}
            projectId={projectId}
            projectKey={projectKey}
          />
        ))}
      </div>
    </DndContext>
  );
}
