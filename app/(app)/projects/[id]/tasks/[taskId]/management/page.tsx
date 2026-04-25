import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { DeleteTaskButton } from "../delete-task-button";

export default async function TaskManagementPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;

  try {
    await requireProjectAccess(projectId);
  } catch {
    notFound();
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true, title: true },
  });
  if (!task) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium">Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Destructive actions live here.
        </p>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-2">
        <h3 className="text-sm font-medium text-destructive">Delete task</h3>
        <p className="text-sm text-muted-foreground">
          Permanently remove this task, its comments, attachments, and all activity
          history. This cannot be undone.
        </p>
        <div className="pt-2">
          <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
        </div>
      </div>
    </div>
  );
}
