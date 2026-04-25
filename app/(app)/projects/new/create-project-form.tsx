"use client";

import { useActionState, useState } from "react";
import { createProject } from "@/app/lib/actions/projects";
import { suggestProjectKey } from "@/lib/validation";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [keyTouched, setKeyTouched] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <Field label="Name" error={state?.errors?.name?.[0]}>
        <input
          name="name"
          required
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!keyTouched) setKey(suggestProjectKey(e.target.value));
          }}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field
        label="Key"
        hint="Short prefix used in task IDs, e.g. PROJ-42. Letters and digits, 2–10 chars."
        error={state?.errors?.key?.[0]}
      >
        <input
          name="key"
          required
          value={key}
          onChange={(e) => {
            setKey(e.target.value.toUpperCase());
            setKeyTouched(true);
          }}
          maxLength={10}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field label="Description" error={state?.errors?.description?.[0]}>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field label="Color" error={state?.errors?.color?.[0]}>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                c === color ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>

      {state?.errors?.form && (
        <p className="text-sm text-destructive">{state.errors.form[0]}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
