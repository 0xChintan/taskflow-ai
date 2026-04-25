"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSprint } from "@/app/lib/actions/sprints";

function todayPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SprintForm({ projectId }: { projectId: string }) {
  const action = createSprint.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 text-sm">
      <Field label="Name" error={state?.errors?.name?.[0]}>
        <input
          name="name"
          required
          placeholder="Sprint 1"
          className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <Field label="Goal (optional)" error={state?.errors?.goal?.[0]}>
        <input
          name="goal"
          placeholder="Ship the kanban beta"
          className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <Field label="Start" error={state?.errors?.startDate?.[0]}>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={todayPlusDays(0)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
      </Field>
      <Field label="End" error={state?.errors?.endDate?.[0]}>
        <input
          name="endDate"
          type="date"
          required
          defaultValue={todayPlusDays(14)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
      </Field>
      {state?.errors?.form && <p className="text-xs text-destructive">{state.errors.form[0]}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create sprint"}
      </button>
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
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
