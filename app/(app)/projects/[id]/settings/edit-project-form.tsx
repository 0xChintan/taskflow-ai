"use client";

import { useActionState, useState } from "react";
import { updateProject } from "@/app/lib/actions/projects";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export function EditProjectForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { name: string; key: string; description: string; color: string };
}) {
  const action = updateProject.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [color, setColor] = useState(initial.color);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" error={state?.errors?.name?.[0]}>
        <input
          name="name"
          required
          defaultValue={initial.name}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field label="Key" error={state?.errors?.key?.[0]}>
        <input
          name="key"
          required
          defaultValue={initial.key}
          maxLength={10}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field label="Description" error={state?.errors?.description?.[0]}>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial.description}
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
