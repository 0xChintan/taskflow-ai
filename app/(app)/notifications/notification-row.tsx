"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "@/app/lib/actions/notifications";

type Item = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  linkUrl: string | null;
  ago: string;
};

export function NotificationRow({ notification }: { notification: Item }) {
  const [pending, startTransition] = useTransition();

  function markRead() {
    if (!notification.isRead) {
      startTransition(() => markNotificationRead(notification.id));
    }
  }

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 transition ${
        !notification.isRead ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="mt-1.5 shrink-0">
        {notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-transparent" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
          {notification.title}
        </div>
        {notification.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">{notification.ago}</p>
      </div>
      {!notification.isRead && (
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            markRead();
          }}
          className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition shrink-0 px-2 py-1 rounded-md hover:bg-subtle"
        >
          Mark read
        </button>
      )}
    </div>
  );

  if (notification.linkUrl) {
    return (
      <li>
        <Link
          href={notification.linkUrl}
          onClick={markRead}
          className="block hover:bg-subtle/50 transition"
        >
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}
