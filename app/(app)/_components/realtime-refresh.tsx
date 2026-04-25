"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function RealtimeRefresh({ channel }: { channel: string }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const url = `/api/realtime?channel=${encodeURIComponent(channel)}`;
    const source = new EventSource(url);

    function scheduleRefresh() {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      // Coalesce bursts (e.g., several columns updating from the same action)
      refreshTimer.current = setTimeout(() => router.refresh(), 100);
    }

    source.addEventListener("ready", () => {
      // initial connection ack — no refresh needed
    });

    function handleEvent() {
      scheduleRefresh();
    }

    // Listen for our event types — a generic message handler also covers anything new.
    const types = [
      "task.created",
      "task.updated",
      "task.moved",
      "task.deleted",
      "comment.added",
      "comment.updated",
      "comment.deleted",
      "attachment.added",
      "attachment.deleted",
      "notification.added",
    ];
    for (const t of types) source.addEventListener(t, handleEvent);

    source.onerror = () => {
      // EventSource auto-reconnects with the `retry:` we set in the route.
    };

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      source.close();
    };
  }, [channel, router]);

  return null;
}
