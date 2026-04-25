"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Priority } from "@prisma/client";
import { PRIORITY_LABEL } from "./labels";

type Member = { id: string; name: string };

export function FilterBar({
  projectId,
  members,
  filters,
  currentUserId,
}: {
  projectId: string;
  members: Member[];
  filters: { q?: string; assignee?: string; priority?: string };
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");

  function pushFilters(next: { q?: string; assignee?: string; priority?: string }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.assignee) params.set("assignee", next.assignee);
    if (next.priority) params.set("priority", next.priority);
    const qs = params.toString();
    startTransition(() => {
      router.push(`/projects/${projectId}${qs ? `?${qs}` : ""}`);
    });
  }

  const hasActive = Boolean(filters.q || filters.assignee || filters.priority);
  const inputClass =
    "rounded-lg border border-border bg-background px-3 py-1.5 text-sm shadow-xs hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushFilters({ ...filters, q: q || undefined });
        }}
        className="relative"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => pushFilters({ ...filters, q: q || undefined })}
          className={`w-56 ${inputClass} pl-8`}
        />
      </form>

      <select
        value={filters.assignee ?? ""}
        onChange={(e) => pushFilters({ ...filters, assignee: e.target.value || undefined })}
        className={inputClass}
      >
        <option value="">All assignees</option>
        <option value="me">Me</option>
        <option value="none">Unassigned</option>
        {members
          .filter((m) => m.id !== currentUserId)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>

      <select
        value={filters.priority ?? ""}
        onChange={(e) => pushFilters({ ...filters, priority: e.target.value || undefined })}
        className={inputClass}
      >
        <option value="">All priorities</option>
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      {hasActive && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            pushFilters({});
          }}
          className="text-sm text-muted-foreground hover:text-foreground hover:bg-subtle px-2.5 py-1.5 rounded-md transition"
        >
          Clear
        </button>
      )}
      {pending && (
        <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      )}
    </div>
  );
}
