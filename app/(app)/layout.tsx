import Link from "next/link";
import { logout } from "@/app/lib/actions/auth";
import { getActiveOrg, getCurrentUser, getOrgsForUser } from "@/lib/dal";
import { OrgSwitcher } from "./_components/org-switcher";
import { NotificationBell } from "./_components/notification-bell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, activeOrg, orgs] = await Promise.all([
    getCurrentUser(),
    getActiveOrg(),
    getOrgsForUser(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold">
              TaskFlow
            </Link>
            <span className="text-muted-foreground">/</span>
            <OrgSwitcher
              active={activeOrg ? { id: activeOrg.id, name: activeOrg.name } : null}
              orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
