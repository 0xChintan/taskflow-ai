import Link from "next/link";
import { getUnreadNotificationCount } from "@/lib/dal";

export async function NotificationBell() {
  const count = await getUnreadNotificationCount();
  const hasUnread = count > 0;

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
        hasUnread
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      aria-label={`Notifications (${count} unread)`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={hasUnread ? "currentColor" : "none"}
        fillOpacity={hasUnread ? 0.15 : 0}
      >
        <path
          d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
