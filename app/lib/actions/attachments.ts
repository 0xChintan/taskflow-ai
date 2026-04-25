"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { channels, publish } from "@/lib/realtime";
import { deleteFileByPublicId, saveFile, validateFile } from "@/lib/storage";

export type UploadState =
  | { errors?: { files?: string[]; form?: string[] }; ok?: boolean }
  | undefined;

function collectFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0);
}

export async function uploadTaskAttachments(
  taskId: string,
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const { userId } = await verifySession();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!task) return { errors: { form: ["Task not found."] } };
  await requireProjectAccess(task.projectId);

  const files = collectFiles(formData);
  if (files.length === 0) return { errors: { files: ["Choose at least one file."] } };

  const errors: string[] = [];
  for (const f of files) {
    const e = validateFile(f);
    if (e) errors.push(e.message);
  }
  if (errors.length) return { errors: { files: errors } };

  for (const f of files) {
    const saved = await saveFile(f);
    await prisma.attachment.create({
      data: {
        taskId,
        uploaderId: userId,
        filename: saved.filename,
        url: saved.url,
        publicId: saved.publicId,
        mimeType: saved.mimeType,
        size: saved.size,
      },
    });
  }

  publish(channels.task(taskId), "attachment.added", { taskId });
  revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
  return { ok: true };
}

export async function deleteAttachment(attachmentId: string) {
  const { userId } = await verifySession();
  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      publicId: true,
      uploaderId: true,
      taskId: true,
      task: { select: { projectId: true, project: { select: { orgId: true } } } },
      comment: {
        select: {
          taskId: true,
          task: { select: { projectId: true, project: { select: { orgId: true } } } },
        },
      },
    },
  });
  if (!att) throw new Error("Not found");

  const parentTaskId = att.taskId ?? att.comment?.taskId ?? null;
  const projectId = att.task?.projectId ?? att.comment?.task.projectId;
  const orgId = att.task?.project.orgId ?? att.comment?.task.project.orgId;
  if (!projectId || !orgId) throw new Error("Orphaned attachment");

  let allowed = att.uploaderId === userId;
  if (!allowed) {
    const member = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });
    allowed = member?.role === Role.OWNER || member?.role === Role.ADMIN;
  }
  if (!allowed) throw new Error("Forbidden");

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteFileByPublicId(att.publicId);

  if (parentTaskId) {
    publish(channels.task(parentTaskId), "attachment.deleted", { attachmentId });
    revalidatePath(`/projects/${projectId}/tasks/${parentTaskId}`);
  }
}
