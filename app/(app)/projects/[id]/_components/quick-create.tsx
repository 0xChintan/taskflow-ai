"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { TaskStatus } from "@prisma/client";
import { createTask } from "@/app/lib/actions/tasks";

export function QuickCreate({
  projectId,
  status,
}: {
  projectId: string;
  status: TaskStatus;
}) {
  const action = createTask.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
      >
        + Add task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="status" value={status} />
      <input
        ref={inputRef}
        name="title"
        required
        placeholder="Task title…"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {state?.errors?.title && (
        <p className="text-xs text-destructive">{state.errors.title[0]}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
