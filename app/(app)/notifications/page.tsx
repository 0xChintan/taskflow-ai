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
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 0 ? "You're all caught up." : `${items.length} recent`}
          </p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Notifications appear when you&apos;re assigned a task,
          mentioned in a comment, or someone comments on your tasks.
        </div>
      ) : (
        <ul className="rounded-md border border-border divide-y divide-border">
          {items.map((n) => (
            <NotificationRow key={n.id} notification={{ ...n, ago: timeAgo(n.createdAt) }} />
          ))}
        </ul>
      )}

      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to projects
        </Link>
      </div>
    </div>
  );
}
