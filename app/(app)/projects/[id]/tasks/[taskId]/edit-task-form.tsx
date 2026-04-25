"use client";

import { useActionState } from "react";
import { Priority, TaskStatus } from "@prisma/client";
import { updateTask } from "@/app/lib/actions/tasks";
import {
  PRIORITY_LABEL,
  STATUS_COLUMNS,
} from "@/app/(app)/projects/[id]/_components/labels";
import { GenerateDescriptionButton } from "./_components/generate-description-button";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

export function EditTaskForm({
  taskId,
  members,
  sprints,
  initial,
}: {
  taskId: string;
  members: { id: string; name: string; email: string }[];
  sprints: { id: string; name: string; isActive: boolean }[];
  initial: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    assigneeId: string;
    sprintId: string;
    storyPoints: string;
    dueDate: string;
  };
}) {
  const action = updateTask.bind(null, taskId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Title" error={state?.errors?.title?.[0]}>
        <input
          name="title"
          required
          defaultValue={initial.title}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base font-medium shadow-xs hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Description</label>
          <GenerateDescriptionButton taskId={taskId} />
        </div>
        <textarea
          name="description"
          rows={6}
          defaultValue={initial.description}
          placeholder="Add more details… markdown supported"
          className={`${inputCls} resize-y leading-relaxed`}
        />
        {state?.errors?.description?.[0] && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status" error={state?.errors?.status?.[0]}>
          <select name="status" defaultValue={initial.status} className={inputCls}>
            {STATUS_COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority" error={state?.errors?.priority?.[0]}>
          <select name="priority" defaultValue={initial.priority} className={inputCls}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Assignee" error={state?.errors?.assigneeId?.[0]}>
          <select name="assigneeId" defaultValue={initial.assigneeId} className={inputCls}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sprint">
          <select name="sprintId" defaultValue={initial.sprintId} className={inputCls}>
            <option value="">No sprint (backlog)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.isActive ? " (active)" : ""}
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
            className={inputCls}
          />
        </Field>

        <Field label="Due date" error={state?.errors?.dueDate?.[0]}>
          <input
            name="dueDate"
            type="date"
            defaultValue={initial.dueDate}
            className={inputCls}
          />
        </Field>
      </div>

      {state?.errors?.form && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.errors.form[0]}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved
          </span>
        )}
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
