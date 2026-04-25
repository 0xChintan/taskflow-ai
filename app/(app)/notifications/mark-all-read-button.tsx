"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/lib/actions/notifications";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
