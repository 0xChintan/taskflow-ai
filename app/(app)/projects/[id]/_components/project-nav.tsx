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
    <div className="flex items-center gap-4 border-b border-border pb-2">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`text-sm border-b-2 pb-2 -mb-2 ${
            active === it.key
              ? "border-foreground text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
