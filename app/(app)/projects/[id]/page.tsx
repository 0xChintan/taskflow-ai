import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { KanbanBoard } from "./_components/kanban-board";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project;
  try {
    ({ project } = await requireProjectAccess(id));
  } catch {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      order: true,
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { order: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-1.5 h-4 w-4 rounded-full"
            style={{ background: project.color }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <span className="text-sm text-muted-foreground font-mono">{project.key}</span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/settings`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Settings
        </Link>
      </div>

      <KanbanBoard tasks={tasks} projectId={project.id} projectKey={project.key} />
    </div>
  );
}
