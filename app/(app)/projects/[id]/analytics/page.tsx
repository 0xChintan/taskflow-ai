import { notFound } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { ProjectNav } from "../_components/project-nav";
import { PRIORITY_LABEL, STATUS_LABEL } from "../_components/labels";
import {
  CompletionGauge,
  PriorityRadial,
  Sparkline,
  StatusDonut,
  ThroughputChart,
  VelocityChart,
  WorkloadList,
  type WorkloadRow,
} from "./charts";
import { InsightsSection } from "./insights-section";

const WEEKS = 8;

function weekKey(d: Date): string {
  // ISO week-friendly key — first day of the week (Mon) yyyy-mm-dd
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

function shortLabel(weekStartIso: string): string {
  const d = new Date(weekStartIso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

  const since = new Date();
  since.setDate(since.getDate() - WEEKS * 7);

  const [
    statusCounts,
    priorityCounts,
    sprints,
    allTasksWithDates,
    assigneeGroups,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: project.id },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { projectId: project.id, status: { not: TaskStatus.CANCELLED } },
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
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        projectId: project.id,
        OR: [
          { createdAt: { gte: since } },
          { completedAt: { gte: since } },
        ],
      },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { projectId: project.id, status: { not: TaskStatus.CANCELLED } },
      _count: true,
    }),
  ]);

  // ---- KPI numbers ----
  const totalTasks = statusCounts.reduce((s, c) => s + c._count, 0);
  const doneTasks = statusCounts.find((s) => s.status === TaskStatus.DONE)?._count ?? 0;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Avg cycle days
  const completedDated = allTasksWithDates.filter((t) => t.completedAt);
  const avgCycleDays =
    completedDated.length > 0
      ? Math.round(
          (completedDated.reduce(
            (sum, t) =>
              sum + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86_400_000,
            0,
          ) /
            completedDated.length) *
            10,
        ) / 10
      : null;

  // ---- Throughput weekly ----
  const weeks: { week: string; weekKey: string; created: number; completed: number }[] = [];
  const now = new Date();
  for (let i = WEEKS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const k = weekKey(d);
    weeks.push({ week: shortLabel(k), weekKey: k, created: 0, completed: 0 });
  }
  const weekIndex = new Map(weeks.map((w, i) => [w.weekKey, i]));
  for (const t of allTasksWithDates) {
    const ck = weekKey(t.createdAt);
    const ci = weekIndex.get(ck);
    if (ci != null) weeks[ci].created++;
    if (t.completedAt) {
      const dk = weekKey(t.completedAt);
      const di = weekIndex.get(dk);
      if (di != null) weeks[di].completed++;
    }
  }

  // ---- Sparkline data for KPI cards ----
  const createdSpark = weeks.map((w) => ({ value: w.created }));
  const completedSpark = weeks.map((w) => ({ value: w.completed }));

  // ---- Status + priority distributions ----
  const statusData = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({
    name: STATUS_LABEL[s],
    value: statusCounts.find((c) => c.status === s)?._count ?? 0,
  }));
  const priorityData = (Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
    name: PRIORITY_LABEL[p],
    value: priorityCounts.find((c) => c.priority === p)?._count ?? 0,
  }));

  // ---- Velocity per sprint ----
  const velocityData = sprints.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    points: s.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
    isActive: s.isActive,
  }));

  // ---- Workload by assignee ----
  const assigneeIds = assigneeGroups.map((g) => g.assigneeId).filter(Boolean) as string[];
  const users = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, avatarUrl: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const doneByAssignee = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: { projectId: project.id, status: TaskStatus.DONE },
    _count: true,
  });
  const doneById = new Map(
    doneByAssignee
      .filter((g) => g.assigneeId)
      .map((g) => [g.assigneeId as string, g._count]),
  );

  const workloadRows: WorkloadRow[] = assigneeGroups
    .filter((g) => g.assigneeId)
    .map((g) => {
      const u = userById.get(g.assigneeId as string);
      const done = doneById.get(g.assigneeId as string) ?? 0;
      const total = g._count;
      return {
        id: g.assigneeId as string,
        name: u?.name ?? "Unknown",
        avatarUrl: u?.avatarUrl ?? null,
        active: Math.max(0, total - done),
        done,
      };
    })
    .sort((a, b) => b.active + b.done - (a.active + a.done));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{project.key}</p>
      </div>

      <ProjectNav projectId={project.id} active="analytics" />

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total tasks"
          value={totalTasks}
          sparkline={<Sparkline data={createdSpark} color="var(--primary)" />}
          hint={`${weeks.reduce((s, w) => s + w.created, 0)} new in 8 weeks`}
        />
        <KpiCard
          label="Completed"
          value={doneTasks}
          sparkline={<Sparkline data={completedSpark} color="#10b981" />}
          hint={`${weeks.reduce((s, w) => s + w.completed, 0)} done in 8 weeks`}
        />
        <KpiCard
          label="Completion"
          value=""
          gauge={<CompletionGauge percent={completionPct} />}
        />
        <KpiCard
          label="Avg cycle time"
          value={avgCycleDays != null ? `${avgCycleDays}d` : "—"}
          hint={
            avgCycleDays != null
              ? `Based on ${completedDated.length} completed`
              : "No completed tasks yet"
          }
        />
      </div>

      {/* Two-column on lg: Status + Priority */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Status distribution" subtitle="Open work across the board">
          <StatusDonut data={statusData} />
        </ChartCard>
        <ChartCard title="Priority breakdown" subtitle="Active tasks by priority">
          <PriorityRadial data={priorityData} />
        </ChartCard>
      </div>

      {/* Throughput full-width */}
      <ChartCard
        title="Throughput"
        subtitle="Tasks created vs. completed, last 8 weeks"
      >
        <ThroughputChart data={weeks.map((w) => ({ week: w.week, created: w.created, completed: w.completed }))} />
        <Legend
          items={[
            { color: "#a78bfa", label: "Created" },
            { color: "#10b981", label: "Completed" },
          ]}
        />
      </ChartCard>

      {/* Velocity full-width */}
      <ChartCard title="Sprint velocity" subtitle="Story points completed per sprint">
        {velocityData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No sprints yet.</p>
        ) : (
          <VelocityChart data={velocityData} />
        )}
      </ChartCard>

      {/* Workload */}
      <ChartCard title="Workload" subtitle="Active vs. completed per assignee">
        <WorkloadList rows={workloadRows} />
      </ChartCard>

      <InsightsSection projectId={project.id} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  sparkline,
  gauge,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  sparkline?: React.ReactNode;
  gauge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {gauge ? (
        <div className="mt-2">{gauge}</div>
      ) : (
        <>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums leading-none">
            {value}
          </div>
          {sparkline && <div className="mt-3 -mx-1">{sparkline}</div>}
          {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-medium">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
