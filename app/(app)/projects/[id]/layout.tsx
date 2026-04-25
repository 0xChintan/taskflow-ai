import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getContrastForeground } from "@/lib/color";
import { verifySession } from "@/lib/dal";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await verifySession();

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      color: true,
      orgId: true,
      org: { select: { members: { where: { userId }, select: { id: true } } } },
    },
  });

  // If project doesn't exist OR user isn't a member of its org, render
  // children with default theme — the page itself will throw 404.
  if (!project || project.org.members.length === 0) {
    notFound();
  }

  const fg = getContrastForeground(project.color);

  return (
    <div
      style={
        {
          "--primary": project.color,
          "--primary-foreground": fg,
          "--ring": project.color,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
