"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getActiveOrg,
  requireOrgRole,
  requireProjectAccess,
  verifySession,
} from "@/lib/dal";
import { ProjectSchema, type ProjectFormState } from "@/lib/validation";

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { userId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) return { errors: { form: ["No active organization."] } };
  await requireOrgRole(org.id, Role.OWNER, Role.ADMIN, Role.MEMBER);

  const parsed = ProjectSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key"),
    description: formData.get("description") || undefined,
    color: formData.get("color"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  let project;
  try {
    project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description,
        color: parsed.data.color,
        orgId: org.id,
        ownerId: userId,
      },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { key: ["A project with this key already exists in this organization."] } };
    }
    throw e;
  }

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  projectId: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { project } = await requireProjectAccess(projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN, Role.MEMBER);

  const parsed = ProjectSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key"),
    description: formData.get("description") || undefined,
    color: formData.get("color"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description,
        color: parsed.data.color,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { key: ["A project with this key already exists in this organization."] } };
    }
    throw e;
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProject(projectId: string) {
  const { project } = await requireProjectAccess(projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN);

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
