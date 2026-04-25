import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveOrg } from "@/lib/dal";
import { OrgSettingsNav } from "../_components/org-settings-nav";

export default async function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = await getActiveOrg();
  if (!org) redirect("/settings/org/new");

  const membersCount = await prisma.orgMember.count({ where: { orgId: org.id } });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to projects
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <div
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground shadow-xs"
            style={{ background: org.color }}
          >
            {org.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{org.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono tracking-wide">
              {org.slug}
            </p>
          </div>
        </div>
      </div>

      <OrgSettingsNav membersCount={membersCount} />

      {children}
    </div>
  );
}
