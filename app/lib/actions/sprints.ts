"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requireOrgRole, requireProjectAccess, verifySession } from "@/lib/dal";
import { channels, publish } from "@/lib/realtime";
import { SprintSchema, type SprintFormState } from "@/lib/validation";

export async function createSprint(
  projectId: string,
  _prev: SprintFormState,
  formData: FormData,
): Promise<SprintFormState> {
  const { userId } = await verifySession();
  const { project } = await requireProjectAccess(projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN, Role.MEMBER);

  const parsed = SprintSchema.safeParse({
    name: formData.get("name"),
    goal: formData.get("goal") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const sprint = await prisma.sprint.create({
    data: {
      projectId,
      name: parsed.data.name,
      goal: parsed.data.goal,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
    select: { id: true, name: true },
  });

  await logActivity({
    action: "sprint.created",
    entityType: "project",
    entityId: sprint.id,
    meta: { name: sprint.name },
    userId,
    projectId,
  });
  publish(channels.project(projectId), "task.updated", { sprintId: sprint.id });
  revalidatePath(`/projects/${projectId}/sprints`);
  return { ok: true };
}

export async function startSprint(sprintId: string) {
  const { userId } = await verifySession();
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, projectId: true, name: true },
  });
  if (!sprint) throw new Error("Not found");
  const { project } = await requireProjectAccess(sprint.projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN, Role.MEMBER);

  await prisma.$transaction([
    prisma.sprint.updateMany({
      where: { projectId: sprint.projectId, isActive: true },
      data: { isActive: false },
    }),
    prisma.sprint.update({ where: { id: sprintId }, data: { isActive: true } }),
  ]);

  await logActivity({
    action: "sprint.started",
    entityType: "project",
    entityId: sprintId,
    meta: { name: sprint.name },
    userId,
    projectId: sprint.projectId,
  });
  publish(channels.project(sprint.projectId), "task.updated", { sprintId });
  revalidatePath(`/projects/${sprint.projectId}/sprints`);
  revalidatePath(`/projects/${sprint.projectId}/analytics`);
}

export async function completeSprint(sprintId: string) {
  const { userId } = await verifySession();
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, projectId: true, name: true },
  });
  if (!sprint) throw new Error("Not found");
  const { project } = await requireProjectAccess(sprint.projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN, Role.MEMBER);

  await prisma.sprint.update({ where: { id: sprintId }, data: { isActive: false } });

  await logActivity({
    action: "sprint.completed",
    entityType: "project",
    entityId: sprintId,
    meta: { name: sprint.name },
    userId,
    projectId: sprint.projectId,
  });
  publish(channels.project(sprint.projectId), "task.updated", { sprintId });
  revalidatePath(`/projects/${sprint.projectId}/sprints`);
  revalidatePath(`/projects/${sprint.projectId}/analytics`);
}

export async function deleteSprint(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, projectId: true },
  });
  if (!sprint) throw new Error("Not found");
  const { project } = await requireProjectAccess(sprint.projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN);

  // Detach tasks first so we don't FK-violate
  await prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } });
  await prisma.sprint.delete({ where: { id: sprintId } });
  publish(channels.project(sprint.projectId), "task.updated", { sprintId });
  revalidatePath(`/projects/${sprint.projectId}/sprints`);
}
