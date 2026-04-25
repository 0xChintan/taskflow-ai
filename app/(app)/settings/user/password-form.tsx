"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/lib/actions/user";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Current password" error={state?.errors?.currentPassword?.[0]}>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </Field>

      <Field
        label="New password"
        hint="At least 8 characters with a letter and a number."
        error={state?.errors?.newPassword?.[0]}
      >
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputCls}
        />
      </Field>

      <Field label="Confirm new password" error={state?.errors?.confirmPassword?.[0]}>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputCls}
        />
      </Field>

      {state?.errors?.form && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.errors.form[0]}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
        {state?.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Password changed
          </span>
        )}
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
