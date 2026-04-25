"use client";

import { useActionState } from "react";
import { updateOrg } from "@/app/lib/actions/orgs";

export function OrgNameForm({
  initialName,
  disabled,
}: {
  initialName: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateOrg, undefined);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialName}
          disabled={disabled}
          className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        )}
      </div>
      {!disabled && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {state?.ok && <span className="text-sm text-muted-foreground">Saved.</span>}
        </div>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can change the organization name.
        </p>
      )}
    </form>
  );
}
