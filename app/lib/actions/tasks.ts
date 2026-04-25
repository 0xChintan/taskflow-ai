"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { createNotifications } from "@/lib/notifications";
import { getOrderBetween } from "@/lib/order";
import { channels, publish } from "@/lib/realtime";
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  type TaskFormState,
} from "@/lib/validation";

async function nextTaskNumber(projectId: string) {
  const last = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

async function nextOrderForColumn(projectId: string, status: TaskStatus) {
  const last = await prisma.task.findFirst({
    where: { projectId, status },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1000;
}

async function getActorName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return u?.name ?? "Someone";
}

export async function createTask(
  projectId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { userId } = await verifySession();
  await requireProjectAccess(projectId);

  const parsed = TaskCreateSchema.safeParse({
    title: formData.get("title"),
    status: formData.get("status") || TaskStatus.TODO,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { title, status } = parsed.data;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [number, order] = await Promise.all([
        nextTaskNumber(projectId),
        nextOrderForColumn(projectId, status),
      ]);
      const task = await prisma.task.create({
        data: { title, status, order, number, projectId, creatorId: userId },
        select: { id: true, title: true, number: true },
      });
      await logActivity({
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        meta: { title: task.title, number: task.number },
        userId,
        projectId,
        taskId: task.id,
      });
      publish(channels.project(projectId), "task.created", { taskId: task.id });
      revalidatePath(`/projects/${projectId}`);
      return { ok: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }
      throw e;
    }
  }
  return { errors: { form: ["Could not create task. Try again."] } };
}

export async function updateTask(
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { userId } = await verifySession();
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      assigneeId: true,
      sprintId: true,
      assignee: { select: { name: true } },
    },
  });
  if (!existing) return { errors: { form: ["Task not found."] } };
  await requireProjectAccess(existing.projectId);

  const parsed = TaskUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") || undefined,
    sprintId: formData.get("sprintId") || undefined,
    storyPoints: formData.get("storyPoints") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { title, description, status, priority, assigneeId, sprintId, storyPoints, dueDate } = parsed.data;
  const newAssigneeId = assigneeId || null;
  const newSprintId = sprintId || null;

  let order: number | undefined;
  if (status !== existing.status) {
    order = await nextOrderForColumn(existing.projectId, status);
  }

  const completedAt =
    status === TaskStatus.DONE && existing.status !== TaskStatus.DONE
      ? new Date()
      : status !== TaskStatus.DONE && existing.status === TaskStatus.DONE
        ? null
        : undefined;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description ?? null,
      status,
      priority,
      assigneeId: newAssigneeId,
      sprintId: newSprintId,
      storyPoints: storyPoints ?? null,
      dueDate: dueDate ?? null,
      ...(order !== undefined ? { order } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  // Log changes
  if (status !== existing.status) {
    await logActivity({
      action: "task.status_changed",
      entityType: "task",
      entityId: taskId,
      meta: { from: existing.status, to: status },
      userId,
      projectId: existing.projectId,
      taskId,
    });
  }
  if (priority !== existing.priority) {
    await logActivity({
      action: "task.priority_changed",
      entityType: "task",
      entityId: taskId,
      meta: { from: existing.priority, to: priority },
      userId,
      projectId: existing.projectId,
      taskId,
    });
  }
  if (newAssigneeId !== existing.assigneeId) {
    let toName: string | null = null;
    if (newAssigneeId) {
      const u = await prisma.user.findUnique({
        where: { id: newAssigneeId },
        select: { name: true },
      });
      toName = u?.name ?? null;
    }
    await logActivity({
      action: "task.assignee_changed",
      entityType: "task",
      entityId: taskId,
      meta: {
        from: existing.assignee?.name ?? null,
        to: toName,
      },
      userId,
      projectId: existing.projectId,
      taskId,
    });

    if (newAssigneeId && newAssigneeId !== userId) {
      const actor = await getActorName(userId);
      await createNotifications([
        {
          userId: newAssigneeId,
          type: "task.assigned",
          title: `${actor} assigned a task to you`,
          body: title,
          linkUrl: `/projects/${existing.projectId}/tasks/${taskId}`,
        },
      ]);
      publish(channels.user(newAssigneeId), "notification.added");
    }
  }
  if (title !== existing.title || (description ?? null) !== existing.description) {
    await logActivity({
      action: "task.edited",
      entityType: "task",
      entityId: taskId,
      meta: {
        fields: [
          ...(title !== existing.title ? ["title"] : []),
          ...((description ?? null) !== existing.description ? ["description"] : []),
        ],
      },
      userId,
      projectId: existing.projectId,
      taskId,
    });
  }

  publish(channels.project(existing.projectId), "task.updated", { taskId });
  publish(channels.task(taskId), "task.updated", { taskId });
  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/projects/${existing.projectId}/tasks/${taskId}`);
  return { ok: true };
}

export async function moveTask(args: {
  taskId: string;
  status: TaskStatus;
  beforeOrder: number | null;
  afterOrder: number | null;
}) {
  const { userId } = await verifySession();
  const { taskId, status, beforeOrder, afterOrder } = args;

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, status: true },
  });
  if (!existing) throw new Error("Not found");
  await requireProjectAccess(existing.projectId);

  const newOrder = getOrderBetween(beforeOrder, afterOrder);
  const completedAt =
    status === TaskStatus.DONE && existing.status !== TaskStatus.DONE
      ? new Date()
      : status !== TaskStatus.DONE && existing.status === TaskStatus.DONE
        ? null
        : undefined;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      order: newOrder,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  if (status !== existing.status) {
    await logActivity({
      action: "task.status_changed",
      entityType: "task",
      entityId: taskId,
      meta: { from: existing.status, to: status },
      userId,
      projectId: existing.projectId,
      taskId,
    });
  }

  publish(channels.project(existing.projectId), "task.moved", { taskId, status });
  revalidatePath(`/projects/${existing.projectId}`);
}

export async function deleteTask(taskId: string) {
  const { userId } = await verifySession();
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, title: true, number: true },
  });
  if (!existing) throw new Error("Not found");
  await requireProjectAccess(existing.projectId);

  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    action: "task.deleted",
    entityType: "task",
    entityId: existing.id,
    meta: { title: existing.title, number: existing.number },
    userId,
    projectId: existing.projectId,
    taskId: null,
  });
  publish(channels.project(existing.projectId), "task.deleted", { taskId });
  publish(channels.task(taskId), "task.deleted", { taskId });
  revalidatePath(`/projects/${existing.projectId}`);
  redirect(`/projects/${existing.projectId}`);
}
