"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import {
  createNotifications,
  extractMentions,
  findMentionedUsers,
} from "@/lib/notifications";
import { saveFile, validateFile } from "@/lib/storage";
import { CommentSchema, type CommentFormState } from "@/lib/validation";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function preview(body: string) {
  return body.slice(0, 140);
}

export async function createComment(
  taskId: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const { userId } = await verifySession();
  const parsed = CommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const files = formData
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0);
  const fileErrors: string[] = [];
  for (const f of files) {
    const e = validateFile(f);
    if (e) fileErrors.push(e.message);
  }
  if (fileErrors.length) return { errors: { form: fileErrors } };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      projectId: true,
      assigneeId: true,
      creatorId: true,
      project: { select: { orgId: true } },
    },
  });
  if (!task) return { errors: { form: ["Task not found."] } };
  await requireProjectAccess(task.projectId);

  const author = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const comment = await prisma.comment.create({
    data: { body: parsed.data.body, taskId, userId },
    select: { id: true, body: true },
  });

  for (const f of files) {
    const saved = await saveFile(f);
    await prisma.attachment.create({
      data: {
        commentId: comment.id,
        uploaderId: userId,
        filename: saved.filename,
        url: saved.url,
        publicId: saved.publicId,
        mimeType: saved.mimeType,
        size: saved.size,
      },
    });
  }

  await logActivity({
    action: "comment.added",
    entityType: "comment",
    entityId: comment.id,
    meta: { preview: preview(comment.body) },
    userId,
    projectId: task.projectId,
    taskId: task.id,
  });

  const linkUrl = `/projects/${task.projectId}/tasks/${task.id}`;
  const watchers = new Set<string>();
  if (task.assigneeId && task.assigneeId !== userId) watchers.add(task.assigneeId);
  if (task.creatorId !== userId) watchers.add(task.creatorId);

  const mentioned = await findMentionedUsers(
    task.project.orgId,
    extractMentions(comment.body),
  );
  const mentionedIds = new Set(mentioned.map((u) => u.id));
  // Mentions take priority — drop from watchers so we don't double-notify.
  for (const id of mentionedIds) watchers.delete(id);
  watchers.delete(userId);

  const notifications = [
    ...mentioned
      .filter((u) => u.id !== userId)
      .map((u) => ({
        userId: u.id,
        type: "comment.mention" as const,
        title: `${author?.name ?? "Someone"} mentioned you`,
        body: preview(comment.body),
        linkUrl,
      })),
    ...[...watchers].map((uid) => ({
      userId: uid,
      type: "comment.added" as const,
      title: `${author?.name ?? "Someone"} commented on "${task.title}"`,
      body: preview(comment.body),
      linkUrl,
    })),
  ];
  await createNotifications(notifications);

  revalidatePath(linkUrl);
  return { ok: true };
}

export async function updateComment(
  commentId: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const { userId } = await verifySession();
  const parsed = CommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      task: { select: { id: true, projectId: true } },
    },
  });
  if (!existing) return { errors: { form: ["Comment not found."] } };
  if (existing.userId !== userId) return { errors: { form: ["Not your comment."] } };
  if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
    return { errors: { form: ["Edit window expired (15 minutes)."] } };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  revalidatePath(`/projects/${existing.task.projectId}/tasks/${existing.task.id}`);
  return { ok: true };
}

export async function deleteComment(commentId: string) {
  const { userId } = await verifySession();
  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, task: { select: { id: true, projectId: true } } },
  });
  if (!existing) throw new Error("Not found");
  if (existing.userId !== userId) throw new Error("Forbidden");

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${existing.task.projectId}/tasks/${existing.task.id}`);
}
