"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { switchOrg } from "@/app/lib/actions/orgs";

type Org = { id: string; name: string };

export function OrgSwitcher({
  active,
  orgs,
}: {
  active: Org | null;
  orgs: Org[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!active) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
      >
        <span className="font-medium">{active.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 rounded-md border border-border bg-background shadow-lg z-10">
          <div className="py-1 max-h-64 overflow-y-auto">
            {orgs.map((org) => (
              <form
                key={org.id}
                action={async () => {
                  await switchOrg(org.id);
                }}
              >
                <button
                  type="submit"
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${
                    org.id === active.id ? "font-medium" : ""
                  }`}
                >
                  {org.name}
                </button>
              </form>
            ))}
          </div>
          <div className="border-t border-border py-1">
            <Link
              href="/settings/org/new"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              + Create organization
            </Link>
            <Link
              href="/settings/org"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              Organization settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
