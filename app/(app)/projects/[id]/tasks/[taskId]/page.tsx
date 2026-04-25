import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { EditTaskForm } from "./edit-task-form";

export default async function TaskEditPage({
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
      title: true,
      description: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      assigneeId: true,
      sprintId: true,
    },
  });
  if (!task) notFound();

  const [members, sprints] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId: project.orgId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.sprint.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    }),
  ]);

  return (
    <EditTaskForm
      taskId={task.id}
      members={members.map((m) => m.user)}
      sprints={sprints}
      initial={{
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ?? "",
        sprintId: task.sprintId ?? "",
        storyPoints: task.storyPoints == null ? "" : String(task.storyPoints),
        dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      }}
    />
  );
}
