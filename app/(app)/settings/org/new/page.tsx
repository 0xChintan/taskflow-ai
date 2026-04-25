import Link from "next/link";
import { NewOrgForm } from "./new-org-form";

export default function NewOrgPage() {
  return (
    <div className="max-w-md space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Create organization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A workspace for your team and its projects.
        </p>
      </div>
      <NewOrgForm />
    </div>
  );
}
