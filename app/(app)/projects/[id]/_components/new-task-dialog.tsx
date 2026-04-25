"use client";

import { useActionState, useEffect, useRef } from "react";
import { TaskStatus } from "@prisma/client";
import { createTask } from "@/app/lib/actions/tasks";
import { STATUS_COLUMNS } from "./labels";

export function NewTaskDialog({ projectId }: { projectId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createTask.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);

  function open() {
    dialogRef.current?.showModal();
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function close() {
    formRef.current?.reset();
    dialogRef.current?.close();
  }

  // Backdrop click closes
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onClick(e: MouseEvent) {
      const rect = d!.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) close();
    }
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);

  // Auto-close on success
  useEffect(() => {
    if (state?.ok) close();
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] transition flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        New task
      </button>
      <dialog
        ref={dialogRef}
        className="rounded-xl border border-border bg-card shadow-lg p-0 backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] w-full max-w-md m-auto"
      >
        <form ref={formRef} action={formAction} className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">New task</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add a task to this project.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              ref={inputRef}
              id="title"
              name="title"
              required
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
            {state?.errors?.title && (
              <p className="text-xs text-destructive">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={TaskStatus.TODO}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            >
              {STATUS_COLUMNS.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {state?.errors?.form && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.errors.form[0]}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-subtle transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
            >
              {pending ? "Creating…" : "Create task"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
