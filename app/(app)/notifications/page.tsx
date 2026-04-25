import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { MarkAllReadButton } from "./mark-all-read-button";
import { NotificationRow } from "./notification-row";

function timeAgo(d: Date) {
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage() {
  const { userId } = await verifySession();
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 0 ? "You're all caught up." : `${items.length} recent`}
          </p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-subtle text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Notifications appear when you&apos;re assigned a task,
            mentioned in a comment, or someone comments on your tasks.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={{ ...n, ago: timeAgo(n.createdAt) }}
              />
            ))}
          </ul>
        </div>
      )}

      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          ← Back to projects
        </Link>
      </div>
    </div>
  );
}
