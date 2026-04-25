"use client";

import { useActionState } from "react";
import { Priority, TaskStatus } from "@prisma/client";
import { updateTask } from "@/app/lib/actions/tasks";
import {
  PRIORITY_LABEL,
  STATUS_COLUMNS,
} from "@/app/(app)/projects/[id]/_components/labels";

export function EditTaskForm({
  taskId,
  members,
  initial,
}: {
  taskId: string;
  members: { id: string; name: string; email: string }[];
  initial: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    assigneeId: string;
    storyPoints: string;
    dueDate: string;
  };
}) {
  const action = updateTask.bind(null, taskId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Title" error={state?.errors?.title?.[0]}>
        <input
          name="title"
          required
          defaultValue={initial.title}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <Field label="Description" error={state?.errors?.description?.[0]}>
        <textarea
          name="description"
          rows={6}
          defaultValue={initial.description}
          placeholder="Add more details…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" error={state?.errors?.status?.[0]}>
          <select
            name="status"
            defaultValue={initial.status}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {STATUS_COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority" error={state?.errors?.priority?.[0]}>
          <select
            name="priority"
            defaultValue={initial.priority}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Assignee" error={state?.errors?.assigneeId?.[0]}>
          <select
            name="assigneeId"
            defaultValue={initial.assigneeId}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Story points" error={state?.errors?.storyPoints?.[0]}>
          <input
            name="storyPoints"
            type="number"
            min={0}
            max={999}
            defaultValue={initial.storyPoints}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Due date" error={state?.errors?.dueDate?.[0]}>
          <input
            name="dueDate"
            type="date"
            defaultValue={initial.dueDate}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

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
