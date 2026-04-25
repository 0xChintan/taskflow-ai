"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const STATUS_COLORS: Record<string, string> = {
  Backlog: "#94a3b8",
  "To Do": "#60a5fa",
  "In Progress": "#a78bfa",
  "In Review": "#f59e0b",
  Done: "#10b981",
  Cancelled: "#cbd5e1",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#3b82f6",
  None: "#cbd5e1",
};

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.06)",
} as const;

/* ---------------------------- Sparkline (mini) ---------------------------- */

export function Sparkline({
  data,
  color = "var(--primary, #6366f1)",
  height = 32,
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.6}
          fill="url(#sparkGrad)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ----------------------------- Completion gauge --------------------------- */

export function CompletionGauge({
  percent,
}: {
  percent: number;
}) {
  const data = [{ name: "done", value: percent, fill: "var(--primary, #6366f1)" }];
  return (
    <div className="relative h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="78%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "#f1f5f9" } as React.SVGProps<SVGElement>}
            dataKey="value"
            cornerRadius={20}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold tabular-nums">{percent}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">done</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Status distribution donut --------------------- */

export function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">No tasks yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-center">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              isAnimationActive={false}
            >
              {filtered.map((d) => (
                <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#cbd5e1"} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-semibold tabular-nums">{total}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">tasks</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {filtered.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: STATUS_COLORS[d.name] ?? "#cbd5e1" }}
              />
              <span className="truncate text-muted-foreground">{d.name}</span>
            </span>
            <span className="tabular-nums font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Priority radial ---------------------------- */

export function PriorityRadial({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">No tasks yet.</p>;
  }

  // Order matters for visual hierarchy in the radial chart
  const order = ["Urgent", "High", "Medium", "Low", "None"];
  const ordered = [...filtered].sort(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-center">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={ordered}
            innerRadius="32%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f1f5f9" } as React.SVGProps<SVGElement>}>
              {ordered.map((d) => (
                <Cell key={d.name} fill={PRIORITY_COLORS[d.name] ?? "#cbd5e1"} />
              ))}
            </RadialBar>
            <Tooltip contentStyle={tooltipStyle} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm">
        {ordered.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: PRIORITY_COLORS[d.name] ?? "#cbd5e1" }}
              />
              <span className="truncate text-muted-foreground">{d.name}</span>
            </span>
            <span className="tabular-nums font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Velocity bars ------------------------------ */

export function VelocityChart({
  data,
}: {
  data: { name: string; points: number; isActive: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -16, top: 8, right: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="velocityActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary, #6366f1)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--primary, #6366f1)" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="velocityInactive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary, #6366f1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--primary, #6366f1)" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="points" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.isActive ? "url(#velocityActive)" : "url(#velocityInactive)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------- Throughput area ----------------------------- */

export function ThroughputChart({
  data,
}: {
  data: { week: string; created: number; completed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -16, top: 8, right: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="created"
          stroke="#a78bfa"
          strokeWidth={2}
          fill="url(#createdGrad)"
          name="Created"
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#completedGrad)"
          name="Completed"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* --------------------------- Workload by assignee ------------------------ */

export type WorkloadRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  active: number;
  done: number;
};

export function WorkloadList({ rows }: { rows: WorkloadRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No assignees yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.active + r.done), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const total = r.active + r.done;
        const activeWidth = (r.active / max) * 100;
        const doneWidth = (r.done / max) * 100;
        return (
          <li key={r.id} className="flex items-center gap-3">
            <img
              src={r.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(r.id)}`}
              alt={r.name}
              width={28}
              height={28}
              className="rounded-full bg-subtle border border-border shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  <span className="text-foreground font-medium">{r.done}</span>
                  <span className="mx-1">/</span>
                  <span>{total}</span>
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${doneWidth}%` }}
                  title={`${r.done} done`}
                />
                <div
                  className="h-full bg-primary/30"
                  style={{ width: `${activeWidth}%` }}
                  title={`${r.active} active`}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
