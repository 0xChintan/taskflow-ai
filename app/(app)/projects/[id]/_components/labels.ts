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
  NONE: "bg-subtle text-muted-foreground",
  LOW: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  MEDIUM: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  HIGH: "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
  URGENT: "bg-red-50 text-red-700 ring-1 ring-red-100",
};
