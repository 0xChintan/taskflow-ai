"use client";

import { useActionState } from "react";
import { updateOrg } from "@/app/lib/actions/orgs";
import { ColorPicker } from "@/app/(app)/_components/color-picker";

export function OrgNameForm({
  initialName,
  initialColor,
  disabled,
}: {
  initialName: string;
  initialColor: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateOrg, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialName}
          disabled={disabled}
          className="w-full max-w-md rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      {!disabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Brand color</label>
          <p className="text-xs text-muted-foreground">
            Active color follows the organization currently in view.
          </p>
          <ColorPicker name="color" defaultValue={initialColor} />
          {state?.errors?.color && (
            <p className="text-xs text-destructive">{state.errors.color[0]}</p>
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          {state?.ok && (
            <span className="text-sm text-muted-foreground">Saved.</span>
          )}
        </div>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can change the organization.
        </p>
      )}
    </form>
  );
}
