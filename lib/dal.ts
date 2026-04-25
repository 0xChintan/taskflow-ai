import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { readSession } from "./session";

const ACTIVE_ORG_COOKIE = "active-org";

export const verifySession = cache(async () => {
  const session = await readSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      timezone: true,
    },
  });
});

export const getOrgsForUser = cache(async () => {
  const { userId } = await verifySession();
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    select: {
      role: true,
      org: { select: { id: true, name: true, slug: true, logoUrl: true, color: true } },
    },
    orderBy: { org: { name: "asc" } },
  });
  return memberships.map((m) => ({ ...m.org, role: m.role }));
});

export const getActiveOrg = cache(async () => {
  const orgs = await getOrgsForUser();
  if (orgs.length === 0) return null;

  const store = await cookies();
  const preferredId = store.get(ACTIVE_ORG_COOKIE)?.value;
  return orgs.find((o) => o.id === preferredId) ?? orgs[0];
});

export async function setActiveOrgCookie(orgId: string) {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireOrgRole(orgId: string, ...allowed: Role[]) {
  const { userId } = await verifySession();
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });
  if (!member || (allowed.length > 0 && !allowed.includes(member.role))) {
    throw new Error("Forbidden");
  }
  return member.role;
}

export const getUnreadNotificationCount = cache(async () => {
  const { userId } = await verifySession();
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
});

export async function requireProjectAccess(projectId: string) {
  const { userId } = await verifySession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, orgId: true, name: true, key: true, color: true, description: true, ownerId: true },
  });
  if (!project) throw new Error("Not found");

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId: project.orgId } },
    select: { role: true },
  });
  if (!member) throw new Error("Forbidden");

  return { project, role: member.role };
}
