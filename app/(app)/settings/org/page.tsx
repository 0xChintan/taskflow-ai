import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveOrg, verifySession } from "@/lib/dal";
import { OrgNameForm } from "./org-name-form";
import { MembersSection } from "./members-section";

export default async function OrgSettingsPage() {
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

  const canManage =
    myMembership?.role === Role.OWNER || myMembership?.role === Role.ADMIN;

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Organization settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{org.slug}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">General</h2>
        <OrgNameForm initialName={org.name} disabled={!canManage} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Members ({members.length})</h2>
        </div>
        <MembersSection
          members={members}
          currentUserId={userId}
          myRole={myMembership?.role ?? Role.VIEWER}
        />
      </section>
    </div>
  );
}
