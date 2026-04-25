"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";

export type AssigneeOption = {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
};

export function AssigneeSelect({
  name,
  defaultValue,
  options,
  placeholder = "Unassigned",
}: {
  name: string;
  defaultValue?: string;
  options: AssigneeOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm shadow-xs hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <Avatar user={selected} size={20} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-subtle border border-border text-muted-foreground text-[11px]">
                ?
              </span>
              <span className="text-muted-foreground">{placeholder}</span>
            </>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-muted-foreground shrink-0"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-30 py-1">
          <Option
            selected={value === ""}
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-subtle border border-border text-muted-foreground text-xs">
              ?
            </span>
            <span className="text-muted-foreground">{placeholder}</span>
          </Option>
          {options.map((o) => (
            <Option
              key={o.id}
              selected={value === o.id}
              onClick={() => {
                setValue(o.id);
                setOpen(false);
              }}
            >
              <Avatar user={o} size={24} />
              <span className="flex-1 truncate">
                <span className="text-sm">{o.name}</span>
                {o.email && (
                  <span className="ml-2 text-xs text-muted-foreground">{o.email}</span>
                )}
              </span>
            </Option>
          ))}
        </div>
      )}
    </div>
  );
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-subtle transition ${
        selected ? "bg-primary/[0.06]" : ""
      }`}
    >
      {children}
      {selected && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary ml-auto shrink-0"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
