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
      className="text-sm text-primary hover:underline disabled:opacity-50 transition"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
