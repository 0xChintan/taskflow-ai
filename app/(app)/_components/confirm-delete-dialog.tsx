"use client";

import { useEffect, useRef, useState, useTransition } from "react";

interface Props {
  title: string;
  description: string;
  /** If set, user must type this exact string to enable the confirm button. */
  confirmText?: string;
  confirmButtonLabel?: string;
  onConfirm: () => Promise<void> | void;
  children: (open: () => void) => React.ReactNode;
}

export function ConfirmDeleteDialog({
  title,
  description,
  confirmText,
  confirmButtonLabel = "Delete forever",
  onConfirm,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  function open() {
    setTyped("");
    dialogRef.current?.showModal();
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function close() {
    dialogRef.current?.close();
  }

  // Click on backdrop closes the dialog
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

  const matches = !confirmText || typed === confirmText;

  return (
    <>
      {children(open)}
      <dialog
        ref={dialogRef}
        className="rounded-xl border border-border bg-card shadow-lg p-0 backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] w-full max-w-md m-auto"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>

          {confirmText && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Type{" "}
                <span className="rounded bg-subtle px-1 py-0.5 font-mono font-semibold text-foreground">
                  {confirmText}
                </span>{" "}
                to confirm.
              </label>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmText}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent transition"
              />
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
              type="button"
              disabled={!matches || pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await onConfirm();
                    // Note: action may redirect; close before it lands.
                    close();
                  } catch {
                    // Keep dialog open on error so user can see + retry.
                  }
                });
              }}
              className="rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {pending ? "Deleting…" : confirmButtonLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
