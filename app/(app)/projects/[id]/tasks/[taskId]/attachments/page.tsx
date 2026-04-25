import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { TaskAttachments } from "../_components/task-attachments";

export default async function TaskAttachmentsPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const { userId } = await verifySession();

  try {
    await requireProjectAccess(projectId);
  } catch {
    notFound();
  }

  const exists = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true },
  });
  if (!exists) notFound();

  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    select: {
      id: true,
      filename: true,
      url: true,
      mimeType: true,
      size: true,
      uploaderId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <TaskAttachments
      taskId={taskId}
      attachments={attachments}
      currentUserId={userId}
    />
  );
}
