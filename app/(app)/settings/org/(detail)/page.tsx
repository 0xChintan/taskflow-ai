import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveOrg, verifySession } from "@/lib/dal";
import { OrgNameForm } from "../org-name-form";
import { DeleteOrgButton } from "../delete-org-button";

export default async function OrgGeneralPage() {
  const { userId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) redirect("/settings/org/new");

  const myMembership = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId: org.id } },
    select: { role: true },
  });

  const canManage =
    myMembership?.role === Role.OWNER || myMembership?.role === Role.ADMIN;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-1">
        <h2 className="text-base font-medium">General</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Organization name and brand color.
        </p>
        <OrgNameForm
          initialName={org.name}
          initialColor={org.color}
          disabled={!canManage}
        />
      </section>

      {myMembership?.role === Role.OWNER && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete this organization and everything in it — projects,
            tasks, comments, attachments, and member records. This cannot be undone.
          </p>
          <div className="mt-3">
            <DeleteOrgButton orgId={org.id} orgName={org.name} />
          </div>
        </section>
      )}
    </div>
  );
}
