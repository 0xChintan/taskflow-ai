import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { ProjectNav } from "../_components/project-nav";
import { SprintForm } from "./sprint-form";
import { SprintRow } from "./sprint-row";

export default async function SprintsPage({
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

  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      name: true,
      goal: true,
      startDate: true,
      endDate: true,
      isActive: true,
      _count: { select: { tasks: true } },
    },
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{project.key}</p>
      </div>

      <ProjectNav projectId={project.id} active="sprints" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {sprints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No sprints yet. Create one on the right to start planning.
            </div>
          ) : (
            <ul className="space-y-3">
              {sprints.map((s) => (
                <SprintRow
                  key={s.id}
                  sprint={{
                    id: s.id,
                    name: s.name,
                    goal: s.goal,
                    startDate: s.startDate.toISOString().slice(0, 10),
                    endDate: s.endDate.toISOString().slice(0, 10),
                    isActive: s.isActive,
                    taskCount: s._count.tasks,
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3 h-fit">
          <h2 className="text-sm font-medium">New sprint</h2>
          <SprintForm projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
