"use client";

import { useActionState, useTransition } from "react";
import { Role } from "@prisma/client";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
} from "@/app/lib/actions/orgs";
import { ConfirmDeleteDialog } from "@/app/(app)/_components/confirm-delete-dialog";
import { Avatar } from "@/app/(app)/_components/avatar";

type Member = {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export function MembersSection({
  members,
  currentUserId,
  myRole,
}: {
  members: Member[];
  currentUserId: string;
  myRole: Role;
}) {
  const canManage = myRole === Role.OWNER || myRole === Role.ADMIN;
  const canChangeRoles = myRole === Role.OWNER;

  return (
    <div className="space-y-4">
      {canManage && <InviteForm />}

      <ul className="rounded-md border border-border divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar user={m.user} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {m.user.name}
                  {m.user.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {canChangeRoles && m.user.id !== currentUserId ? (
                <RoleSelect memberId={m.id} role={m.role} />
              ) : (
                <span className="text-sm text-muted-foreground">{ROLE_LABEL[m.role]}</span>
              )}
              {canManage && m.user.id !== currentUserId && (
                <RemoveButton memberId={m.id} memberName={m.user.name} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, undefined);
  return (
    <form action={action} className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
      <h3 className="text-sm font-medium">Add member</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="teammate@example.com"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          name="role"
          defaultValue={Role.MEMBER}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value={Role.ADMIN}>Admin</option>
          <option value={Role.MEMBER}>Member</option>
          <option value={Role.VIEWER}>Viewer</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state?.errors?.email && (
        <p className="text-xs text-destructive">{state.errors.email[0]}</p>
      )}
      {state?.errors?.form && (
        <p className="text-xs text-destructive">{state.errors.form[0]}</p>
      )}
      {state?.ok && <p className="text-xs text-muted-foreground">Added.</p>}
    </form>
  );
}

function RoleSelect({ memberId, role }: { memberId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Role;
        startTransition(() => changeMemberRole(memberId, next));
      }}
      className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
    >
      <option value={Role.OWNER}>Owner</option>
      <option value={Role.ADMIN}>Admin</option>
      <option value={Role.MEMBER}>Member</option>
      <option value={Role.VIEWER}>Viewer</option>
    </select>
  );
}

function RemoveButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  return (
    <ConfirmDeleteDialog
      title="Remove member?"
      description={`Remove ${memberName} from this organization. They'll lose access to all projects and tasks here.`}
      confirmButtonLabel="Remove member"
      onConfirm={() => removeMember(memberId)}
    >
      {(open) => (
        <button
          type="button"
          onClick={open}
          className="text-xs text-destructive hover:underline transition"
        >
          Remove
        </button>
      )}
    </ConfirmDeleteDialog>
  );
}
