import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/dal";
import { CreateProjectForm } from "./create-project-form";

export default async function NewProjectPage() {
  const org = await getActiveOrg();
  if (!org) redirect("/settings/org/new");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creating in <span className="text-foreground">{org.name}</span>.
        </p>
      </div>
      <CreateProjectForm />
    </div>
  );
}
