import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireProjectAccess, verifySession } from "@/lib/dal";
import { KanbanBoard } from "./_components/kanban-board";
import { FilterBar } from "./_components/filter-bar";

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

      <FilterBar
        projectId={project.id}
        members={members.map((m) => m.user)}
        filters={filters.raw}
        currentUserId={userId}
      />

      <KanbanBoard tasks={tasks} projectId={project.id} projectKey={project.key} />
    </div>
  );
}
