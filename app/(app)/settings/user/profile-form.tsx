"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/lib/actions/user";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

export function ProfileForm({
  initial,
  email,
}: {
  initial: { name: string; avatarUrl: string; timezone: string };
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  // Make sure the user's current timezone shows in the dropdown even if it's
  // not in the curated list.
  const timezones = COMMON_TIMEZONES.includes(initial.timezone)
    ? COMMON_TIMEZONES
    : [initial.timezone, ...COMMON_TIMEZONES];

  return (
    <form action={action} className="space-y-4">
      <Field label="Name" error={state?.errors?.name?.[0]}>
        <input
          name="name"
          required
          defaultValue={initial.name}
          className={inputCls}
        />
      </Field>

      <Field label="Email" hint="Email cannot be changed yet.">
        <input
          name="email"
          type="email"
          value={email}
          disabled
          className={`${inputCls} disabled:opacity-70 disabled:cursor-not-allowed`}
        />
      </Field>

      <Field
        label="Avatar URL"
        hint="Public image URL. Leave empty to use initials."
        error={state?.errors?.avatarUrl?.[0]}
      >
        <input
          name="avatarUrl"
          type="url"
          defaultValue={initial.avatarUrl}
          placeholder="https://example.com/me.jpg"
          className={inputCls}
        />
      </Field>

      <Field label="Timezone" error={state?.errors?.timezone?.[0]}>
        <select
          name="timezone"
          defaultValue={initial.timezone}
          className={inputCls}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
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
          {pending ? "Saving…" : "Save profile"}
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
            Saved
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
