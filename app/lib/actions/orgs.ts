"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifySession, requireOrgRole, setActiveOrgCookie, getActiveOrg } from "@/lib/dal";
import { createNotifications } from "@/lib/notifications";
import { channels, publish } from "@/lib/realtime";
import {
  InviteSchema,
  OrgSchema,
  suggestOrgSlug,
  type InviteFormState,
  type OrgFormState,
} from "@/lib/validation";

export async function createOrg(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const { userId } = await verifySession();
  const parsed = OrgSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug: suggestOrgSlug(parsed.data.name),
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      members: { create: { userId, role: Role.OWNER } },
    },
    select: { id: true },
  });

  await setActiveOrgCookie(org.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function switchOrg(orgId: string) {
  const { userId } = await verifySession();
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { id: true },
  });
  if (!member) throw new Error("Forbidden");

  await setActiveOrgCookie(orgId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateOrg(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const org = await getActiveOrg();
  if (!org) return { errors: { form: ["No active organization."] } };

  await requireOrgRole(org.id, Role.OWNER, Role.ADMIN);

  const parsed = OrgSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function inviteMember(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const { userId: actorId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) return { errors: { form: ["No active organization."] } };

  await requireOrgRole(org.id, Role.OWNER, Role.ADMIN);

  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (!user) {
    return {
      errors: {
        email: ["No user with that email yet. Email-based invites ship in a later phase — ask them to sign up first."],
      },
    };
  }

  const existing = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    select: { id: true },
  });
  if (existing) return { errors: { email: ["Already a member."] } };

  await prisma.orgMember.create({
    data: { userId: user.id, orgId: org.id, role: parsed.data.role },
  });

  if (user.id !== actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    await createNotifications([
      {
        userId: user.id,
        type: "org.member_added",
        title: `${actor?.name ?? "Someone"} added you to ${org.name}`,
        body: `You're now a ${parsed.data.role.toLowerCase()} of this organization.`,
        linkUrl: "/dashboard",
      },
    ]);
    publish(channels.user(user.id), "notification.added");
  }

  revalidatePath("/settings/org");
  return { ok: true };
}

export async function deleteOrg(orgId: string) {
  const { userId: actorId } = await verifySession();
  await requireOrgRole(orgId, Role.OWNER);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      members: { select: { userId: true } },
    },
  });
  if (!org) throw new Error("Not found");

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true },
  });

  await prisma.organization.delete({ where: { id: orgId } });

  // Notify every other member that the org is gone
  const otherMembers = org.members
    .map((m) => m.userId)
    .filter((id) => id !== actorId);

  if (otherMembers.length > 0) {
    await createNotifications(
      otherMembers.map((uid) => ({
        userId: uid,
        type: "org.deleted",
        title: `${actor?.name ?? "Someone"} deleted "${org.name}"`,
        body: "All projects, tasks, and files in that organization were removed.",
        linkUrl: "/dashboard",
      })),
    );
    for (const uid of otherMembers) {
      publish(channels.user(uid), "notification.added");
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function changeMemberRole(memberId: string, role: Role) {
  const { userId: actorId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) throw new Error("No active organization.");
  await requireOrgRole(org.id, Role.OWNER);

  const member = await prisma.orgMember.findUnique({
    where: { id: memberId },
    select: { id: true, orgId: true, userId: true, role: true },
  });
  if (!member || member.orgId !== org.id) throw new Error("Not found");

  if (member.role === Role.OWNER && role !== Role.OWNER) {
    const ownerCount = await prisma.orgMember.count({
      where: { orgId: org.id, role: Role.OWNER },
    });
    if (ownerCount <= 1) throw new Error("Cannot demote the last owner.");
  }

  await prisma.orgMember.update({ where: { id: memberId }, data: { role } });

  if (member.userId !== actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    await createNotifications([
      {
        userId: member.userId,
        type: "org.role_changed",
        title: `${actor?.name ?? "Someone"} changed your role in ${org.name}`,
        body: `You're now a ${role.toLowerCase()}.`,
        linkUrl: "/settings/org",
      },
    ]);
    publish(channels.user(member.userId), "notification.added");
  }

  revalidatePath("/settings/org");
}

export async function removeMember(memberId: string) {
  const { userId: actorId } = await verifySession();
  const org = await getActiveOrg();
  if (!org) throw new Error("No active organization.");
  await requireOrgRole(org.id, Role.OWNER, Role.ADMIN);

  const member = await prisma.orgMember.findUnique({
    where: { id: memberId },
    select: { id: true, orgId: true, userId: true, role: true },
  });
  if (!member || member.orgId !== org.id) throw new Error("Not found");

  if (member.role === Role.OWNER) {
    const ownerCount = await prisma.orgMember.count({
      where: { orgId: org.id, role: Role.OWNER },
    });
    if (ownerCount <= 1) throw new Error("Cannot remove the last owner.");
  }

  await prisma.orgMember.delete({ where: { id: memberId } });

  if (member.userId !== actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    await createNotifications([
      {
        userId: member.userId,
        type: "org.removed",
        title: `${actor?.name ?? "Someone"} removed you from ${org.name}`,
        body: "You no longer have access to this organization.",
        linkUrl: "/dashboard",
      },
    ]);
    publish(channels.user(member.userId), "notification.added");
  }

  revalidatePath("/settings/org");
}
