import Link from "next/link";
import { logout } from "@/app/lib/actions/auth";
import { getActiveOrg, getCurrentUser, getOrgsForUser } from "@/lib/dal";
import { verifySession } from "@/lib/dal";
import { DEFAULT_ORG_COLOR, getContrastForeground } from "@/lib/color";
import { OrgSwitcher } from "./_components/org-switcher";
import { NotificationBell } from "./_components/notification-bell";
import { RealtimeRefresh } from "./_components/realtime-refresh";
import { LogoMark } from "./_components/logo";
import { Avatar } from "./_components/avatar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ userId }, user, activeOrg, orgs] = await Promise.all([
    verifySession(),
    getCurrentUser(),
    getActiveOrg(),
    getOrgsForUser(),
  ]);

  const brand = activeOrg?.color ?? DEFAULT_ORG_COLOR;
  const brandForeground = getContrastForeground(brand);

  return (
    <div
      className="flex flex-1 flex-col bg-muted/40"
      style={
        {
          "--primary": brand,
          "--primary-foreground": brandForeground,
          "--ring": brand,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-primary"
            >
              <LogoMark size={26} />
              <span className="text-foreground">TaskFlow</span>
            </Link>
            <span className="text-border-strong">/</span>
            <OrgSwitcher
              active={activeOrg ? { id: activeOrg.id, name: activeOrg.name, color: activeOrg.color } : null}
              orgs={orgs.map((o) => ({ id: o.id, name: o.name, color: o.color }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2 ml-1 pl-3 border-l border-border">
              <Link
                href="/settings/user"
                title={`${user?.name} — account settings`}
                className="rounded-full hover:ring-2 hover:ring-border-strong hover:ring-offset-2 hover:ring-offset-background transition"
              >
                {user && (
                  <Avatar user={user} size={32} />
                )}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground transition px-2"
                  title={user?.email}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
      <RealtimeRefresh channel={`user:${userId}`} />
    </div>
  );
}
