"use server";

import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MissingAnthropicKeyError,
  generateDescription,
  getProjectInsights,
  type GeneratedDescription,
  type ProjectInsights,
} from "@/lib/ai";
import { requireProjectAccess } from "@/lib/dal";

export type GenerateDescriptionResult =
  | { ok: true; data: GeneratedDescription }
  | { ok: false; error: string };

export async function generateTaskDescription(
  taskId: string,
): Promise<GenerateDescriptionResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, projectId: true },
  });
  if (!task) return { ok: false, error: "Task not found." };
  await requireProjectAccess(task.projectId);

  try {
    const data = await generateDescription(task.title);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof MissingAnthropicKeyError) {
      return { ok: false, error: e.message };
    }
    console.error("generateTaskDescription failed", e);
    return { ok: false, error: "AI request failed. Try again." };
  }
}

export type ProjectInsightsResult =
  | { ok: true; data: ProjectInsights }
  | { ok: false; error: string };

export async function generateProjectInsights(
  projectId: string,
): Promise<ProjectInsightsResult> {
  const { project } = await requireProjectAccess(projectId);

  const [statusCounts, overdue, unassigned, activeSprint, sprints, doneTasks] =
    await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId },
        _count: true,
      }),
      prisma.task.count({
        where: {
          projectId,
          dueDate: { lt: new Date() },
          status: { not: TaskStatus.DONE },
        },
      }),
      prisma.task.count({
        where: { projectId, assigneeId: null, status: { not: TaskStatus.DONE } },
      }),
      prisma.sprint.findFirst({
        where: { projectId, isActive: true },
        select: {
          name: true,
          startDate: true,
          endDate: true,
          tasks: { select: { status: true } },
        },
      }),
      prisma.sprint.findMany({
        where: { projectId, isActive: false },
        select: {
          name: true,
          tasks: {
            where: { status: TaskStatus.DONE },
            select: { storyPoints: true },
          },
        },
        orderBy: { endDate: "desc" },
        take: 5,
      }),
      prisma.task.findMany({
        where: { projectId, status: TaskStatus.DONE, completedAt: { not: null } },
        select: { createdAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: "desc" },
      }),
    ]);

  const get = (s: TaskStatus) => statusCounts.find((c) => c.status === s)?._count ?? 0;
  const totals = {
    tasks: statusCounts.reduce((sum, s) => sum + s._count, 0),
    done: get(TaskStatus.DONE),
    inProgress: get(TaskStatus.IN_PROGRESS),
    inReview: get(TaskStatus.IN_REVIEW),
    backlog: get(TaskStatus.BACKLOG),
    todo: get(TaskStatus.TODO),
    cancelled: get(TaskStatus.CANCELLED),
    overdue,
    unassigned,
  };

  const avgCycleDays =
    doneTasks.length > 0
      ? Math.round(
          (doneTasks.reduce(
            (sum, t) =>
              sum + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86_400_000,
            0,
          ) /
            doneTasks.length) *
            10,
        ) / 10
      : null;

  try {
    const data = await getProjectInsights({
      projectName: project.name,
      projectKey: project.key,
      totals,
      avgCycleDays,
      activeSprint: activeSprint
        ? {
            name: activeSprint.name,
            startDate: activeSprint.startDate.toISOString().slice(0, 10),
            endDate: activeSprint.endDate.toISOString().slice(0, 10),
            tasksInSprint: activeSprint.tasks.length,
            tasksDoneInSprint: activeSprint.tasks.filter(
              (t) => t.status === TaskStatus.DONE,
            ).length,
          }
        : null,
      recentVelocity: sprints.map((s) => ({
        sprint: s.name,
        pointsCompleted: s.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
      })),
    });
    return { ok: true, data };
  } catch (e) {
    if (e instanceof MissingAnthropicKeyError) {
      return { ok: false, error: e.message };
    }
    console.error("generateProjectInsights failed", e);
    return { ok: false, error: "AI request failed. Try again." };
  }
}
