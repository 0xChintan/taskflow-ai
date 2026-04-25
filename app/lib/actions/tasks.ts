"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { getOrderBetween } from "@/lib/order";
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
      await prisma.task.create({
        data: {
          title,
          status,
          order,
          number,
          projectId,
          creatorId: userId,
        },
      });
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
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, status: true },
  });
  if (!existing) return { errors: { form: ["Task not found."] } };
  await requireProjectAccess(existing.projectId);

  const parsed = TaskUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") || undefined,
    storyPoints: formData.get("storyPoints") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { title, description, status, priority, assigneeId, storyPoints, dueDate } = parsed.data;

  // If column changed, drop to bottom of new column
  let order: number | undefined;
  if (status !== existing.status) {
    order = await nextOrderForColumn(existing.projectId, status);
  }

  const completedAt =
    status === TaskStatus.DONE && existing.status !== TaskStatus.DONE
      ? new Date()
      : status !== TaskStatus.DONE
        ? null
        : undefined;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      storyPoints: storyPoints ?? null,
      dueDate: dueDate ?? null,
      ...(order !== undefined ? { order } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

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

  revalidatePath(`/projects/${existing.projectId}`);
}

export async function deleteTask(taskId: string) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!existing) throw new Error("Not found");
  await requireProjectAccess(existing.projectId);

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${existing.projectId}`);
  redirect(`/projects/${existing.projectId}`);
}
