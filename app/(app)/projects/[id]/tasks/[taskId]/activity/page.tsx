import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { ActivityFeed } from "../_components/activity-feed";

export default async function TaskActivityPage({
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

  return <ActivityFeed taskId={taskId} currentUserId={userId} />;
}
