"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OrgSettingsNav({ membersCount }: { membersCount: number }) {
  const pathname = usePathname();
  const active: "general" | "members" = pathname.endsWith("/members")
    ? "members"
    : "general";

  const items: {
    key: typeof active;
    label: string;
    href: string;
    badge?: number;
  }[] = [
    { key: "general", label: "General", href: "/settings/org" },
    { key: "members", label: "Members", href: "/settings/org/members", badge: membersCount },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`relative flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
            active === it.key
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {it.label}
          {typeof it.badge === "number" && (
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
