import { getCurrentUser } from "@/lib/dal";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user?.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Phase 1 is live. Orgs, projects, and tasks ship in the next phase.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <h2 className="text-sm font-medium">What works right now</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>Email + password signup with bcrypt-hashed credentials</li>
          <li>Stateless JWT sessions in HTTP-only cookies (jose, 7 day TTL)</li>
          <li>Proxy redirects unauthenticated users to /login</li>
          <li>Server-side data access layer with cached session checks</li>
          <li>Postgres + Prisma schema covering the full app domain</li>
        </ul>
      </div>
    </div>
  );
}
