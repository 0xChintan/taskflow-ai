import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { KanbanBoard } from "./_components/kanban-board";
import { FilterBar } from "./_components/filter-bar";
import { ProjectNav } from "./_components/project-nav";
import { NewTaskDialog } from "./_components/new-task-dialog";
import { RealtimeRefresh } from "@/app/(app)/_components/realtime-refresh";

const PRIORITY_VALUES = new Set<string>(Object.values(Priority));

function parseFilters(sp: { [key: string]: string | string[] | undefined }, currentUserId: string) {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = get("q")?.trim() || undefined;
  const assigneeRaw = get("assignee");
  const priorityRaw = get("priority");

  let assigneeFilter: Prisma.TaskWhereInput | undefined;
  if (assigneeRaw === "me") assigneeFilter = { assigneeId: currentUserId };
  else if (assigneeRaw === "none") assigneeFilter = { assigneeId: null };
  else if (assigneeRaw) assigneeFilter = { assigneeId: assigneeRaw };

  const priority =
    priorityRaw && PRIORITY_VALUES.has(priorityRaw) ? (priorityRaw as Priority) : undefined;

  return {
    raw: { q, assignee: assigneeRaw, priority: priorityRaw },
    where: {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(assigneeFilter ?? {}),
      ...(priority ? { priority } : {}),
    },
  };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { userId } = await verifySession();

  let project;
  try {
    ({ project } = await requireProjectAccess(id));
  } catch {
    notFound();
  }

  const filters = parseFilters(sp, userId);

  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: project.id, ...filters.where },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        order: true,
        assignee: { select: { id: true, name: true } },
        sprint: { select: { name: true, isActive: true } },
      },
      orderBy: [{ status: "asc" }, { order: "asc" }],
    }),
    prisma.orgMember.findMany({
      where: { orgId: project.orgId },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-xs"
            style={{ background: project.color }}
          >
            {project.key.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
              <span className="text-xs text-muted-foreground font-mono tracking-wide">
                {project.key}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/projects/${project.id}/settings`}
            className="text-sm text-muted-foreground hover:text-foreground hover:bg-subtle px-2.5 py-1.5 rounded-md transition"
          >
            Settings
          </Link>
          <NewTaskDialog projectId={project.id} />
        </div>
      </div>

      <ProjectNav projectId={project.id} active="board" />

      <FilterBar
        projectId={project.id}
        members={members.map((m) => m.user)}
        filters={filters.raw}
        currentUserId={userId}
      />

      <KanbanBoard tasks={tasks} projectId={project.id} projectKey={project.key} />

      <RealtimeRefresh channel={`project:${project.id}`} />
    </div>
  );
}
