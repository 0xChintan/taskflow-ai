import { Priority, TaskStatus } from "@prisma/client";

export const STATUS_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.BACKLOG, label: "Backlog" },
  { status: TaskStatus.TODO, label: "To Do" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { status: TaskStatus.IN_REVIEW, label: "In Review" },
  { status: TaskStatus.DONE, label: "Done" },
  { status: TaskStatus.CANCELLED, label: "Cancelled" },
];

export const STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  STATUS_COLUMNS.map((c) => [c.status, c.label]),
) as Record<TaskStatus, string>;

export const PRIORITY_LABEL: Record<Priority, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_CLASS: Record<Priority, string> = {
  NONE: "bg-muted text-muted-foreground",
  LOW: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
