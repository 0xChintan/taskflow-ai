"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = "edit" | "activity" | "attachments" | "management";

export function TaskDetailNav({
  projectId,
  taskId,
  attachmentCount,
}: {
  projectId: string;
  taskId: string;
  attachmentCount: number;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}/tasks/${taskId}`;

  let active: Tab = "edit";
  if (pathname.endsWith("/activity")) active = "activity";
  else if (pathname.endsWith("/attachments")) active = "attachments";
  else if (pathname.endsWith("/management")) active = "management";

  const items: { key: Tab; label: string; href: string; badge?: number }[] = [
    { key: "edit", label: "Edit", href: base },
    { key: "activity", label: "Activity", href: `${base}/activity` },
    {
      key: "attachments",
      label: "Attachments",
      href: `${base}/attachments`,
      badge: attachmentCount,
    },
    { key: "management", label: "Management", href: `${base}/management` },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`relative flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
            active === it.key
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {it.label}
          {typeof it.badge === "number" && it.badge > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                active === it.key
                  ? "bg-primary/15 text-primary"
                  : "bg-subtle text-muted-foreground"
              }`}
            >
              {it.badge}
            </span>
          )}
          {active === it.key && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </Link>
      ))}
    </div>
  );
}
