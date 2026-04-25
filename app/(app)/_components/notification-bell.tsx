import Link from "next/link";
import { getUnreadNotificationCount } from "@/lib/dal";

export async function NotificationBell() {
  const count = await getUnreadNotificationCount();
  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Notifications (${count} unread)`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
