import Link from "next/link";

export function ProjectNav({
  projectId,
  active,
}: {
  projectId: string;
  active: "board" | "sprints" | "analytics";
}) {
  const items: { key: typeof active; label: string; href: string }[] = [
    { key: "board", label: "Board", href: `/projects/${projectId}` },
    { key: "sprints", label: "Sprints", href: `/projects/${projectId}/sprints` },
    { key: "analytics", label: "Analytics", href: `/projects/${projectId}/analytics` },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`relative px-3 py-2 text-sm transition-colors ${
            active === it.key
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {it.label}
          {active === it.key && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </Link>
      ))}
    </div>
  );
}
