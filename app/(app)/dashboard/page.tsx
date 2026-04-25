import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActiveOrg } from "@/lib/dal";

export default async function DashboardPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center max-w-lg mx-auto">
        <h2 className="text-base font-medium">No organization yet</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You don&apos;t belong to any organization.
        </p>
        <Link
          href="/settings/org/new"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition"
        >
          Create one
        </Link>
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      color: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: org.color }} />
              {org.name}
            </span>
            {" · "}
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] transition flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${org.color}15`, color: org.color }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <h2 className="text-base font-medium">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to start organizing tasks.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            Create project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-md hover:border-border-strong hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
                  style={{ background: p.color }}
                >
                  {p.key.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground tracking-wide">
                      {p.key}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-snug">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {p._count.tasks} {p._count.tasks === 1 ? "task" : "tasks"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
