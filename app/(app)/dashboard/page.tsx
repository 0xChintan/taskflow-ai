import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActiveOrg } from "@/lib/dal";

export default async function DashboardPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="text-sm text-muted-foreground">
        You don&apos;t belong to any organization yet.{" "}
        <Link href="/settings/org/new" className="underline">
          Create one
        </Link>
        .
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {org.name} · {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-sm font-medium">No projects yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first project to get started.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create project
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group rounded-lg border border-border bg-background p-4 hover:border-foreground/20"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.key}</span>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
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
