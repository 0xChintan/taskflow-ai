import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/dal";
import { EditProjectForm } from "./edit-project-form";
import { DeleteProjectButton } from "./delete-project-button";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project;
  let role;
  try {
    ({ project, role } = await requireProjectAccess(id));
  } catch {
    notFound();
  }

  const canDelete = role === "OWNER" || role === "ADMIN";

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Project settings</h1>
      </div>

      <EditProjectForm
        projectId={project.id}
        initial={{
          name: project.name,
          key: project.key,
          description: project.description ?? "",
          color: project.color,
        }}
      />

      {canDelete && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting this project removes all tasks, comments, and history. This cannot be undone.
          </p>
          <div className="mt-3">
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        </div>
      )}
    </div>
  );
}
