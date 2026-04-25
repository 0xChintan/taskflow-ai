import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { EditTaskForm } from "./edit-task-form";
import { DeleteTaskButton } from "./delete-task-button";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;

  let project;
  try {
    ({ project } = await requireProjectAccess(projectId));
  } catch {
    notFound();
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      assigneeId: true,
      creator: { select: { name: true } },
      createdAt: true,
    },
  });
  if (!task) notFound();

  const members = await prisma.orgMember.findMany({
    where: { orgId: project.orgId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to board
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">
            {project.key}-{task.number}
          </span>
          <span className="text-xs text-muted-foreground">
            opened by {task.creator.name}
          </span>
        </div>
      </div>

      <EditTaskForm
        taskId={task.id}
        members={members.map((m) => m.user)}
        initial={{
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId ?? "",
          storyPoints: task.storyPoints == null ? "" : String(task.storyPoints),
          dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
        }}
      />

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a task is permanent.
        </p>
        <div className="mt-3">
          <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
        </div>
      </div>
    </div>
  );
}
