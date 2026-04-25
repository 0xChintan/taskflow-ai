import { notFound } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { ProjectNav } from "../_components/project-nav";
import { STATUS_LABEL } from "../_components/labels";
import {
  CompletionChart,
  StatusDonut,
  VelocityChart,
} from "./charts";
import { InsightsSection } from "./insights-section";

export default async function AnalyticsPage({
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

  const [statusCounts, sprints, completedTasks] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: project.id },
      _count: true,
    }),
    prisma.sprint.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        tasks: {
          where: { status: TaskStatus.DONE },
          select: { storyPoints: true },
        },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.task.findMany({
      where: { projectId: project.id, completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  const totalTasks = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const doneTasks = statusCounts.find((s) => s.status === TaskStatus.DONE)?._count ?? 0;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusData = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({
    name: STATUS_LABEL[s],
    value: statusCounts.find((c) => c.status === s)?._count ?? 0,
  }));

  const velocityData = sprints.map((s) => ({
    name: s.name,
    points: s.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
    isActive: s.isActive,
  }));

  // Cumulative completion over time (one point per day)
  const completionData: { date: string; total: number }[] = [];
  if (completedTasks.length > 0) {
    const buckets = new Map<string, number>();
    for (const t of completedTasks) {
      const key = t.completedAt!.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    let cum = 0;
    for (const [date, n] of [...buckets.entries()].sort()) {
      cum += n;
      completionData.push({ date, total: cum });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{project.key}</p>
      </div>

      <ProjectNav projectId={project.id} active="analytics" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total tasks" value={totalTasks} />
        <Stat label="Completed" value={doneTasks} />
        <Stat label="Completion" value={`${completionPct}%`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Status distribution</h2>
        <div className="rounded-lg border border-border bg-background p-4">
          <StatusDonut data={statusData} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Velocity (story points completed per sprint)</h2>
        <div className="rounded-lg border border-border bg-background p-4">
          {velocityData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sprints yet.
            </p>
          ) : (
            <VelocityChart data={velocityData} />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Cumulative completion</h2>
        <div className="rounded-lg border border-border bg-background p-4">
          {completionData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No tasks completed yet.
            </p>
          ) : (
            <CompletionChart data={completionData} />
          )}
        </div>
      </section>

      <InsightsSection projectId={project.id} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
