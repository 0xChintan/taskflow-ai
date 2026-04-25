import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveOrg, verifySession } from "@/lib/dal";
import { MembersSection } from "../../members-section";

export default async function OrgMembersPage() {
  const { userId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) redirect("/settings/org/new");

  const myMembership = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId: org.id } },
    select: { role: true },
  });

  const members = await prisma.orgMember.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });

  return (
    <div className="space-y-2">
      <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-1">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">Members</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {members.length} {members.length === 1 ? "person" : "people"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Invite teammates and manage roles.
        </p>
        <MembersSection
          members={members}
          currentUserId={userId}
          myRole={myMembership?.role ?? Role.VIEWER}
        />
      </section>
    </div>
  );
}
