"use client";

import { useActionState } from "react";
import { createOrg } from "@/app/lib/actions/orgs";
import { ColorPicker } from "@/app/(app)/_components/color-picker";

export function NewOrgForm() {
  const [state, action, pending] = useActionState(createOrg, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          placeholder="Acme Inc"
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Brand color</label>
        <p className="text-xs text-muted-foreground">
          Used across buttons, links, and active states when this org is selected.
        </p>
        <ColorPicker name="color" />
        {state?.errors?.color && (
          <p className="text-xs text-destructive">{state.errors.color[0]}</p>
        )}
      </div>

      {state?.errors?.form && (
        <p className="text-sm text-destructive">{state.errors.form[0]}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
