import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/dal";

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

      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <h2 className="text-sm font-medium">Tasks land in phase 3</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The kanban board, task CRUD, and drag-and-drop ordering ship next.
        </p>
      </div>
    </div>
  );
}
