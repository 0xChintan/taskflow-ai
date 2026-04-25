import "server-only";
import { prisma } from "./db";

const MENTION_RE = /(?:^|\s)@([a-zA-Z][\w.-]{1,29})/g;

export function extractMentions(body: string): string[] {
  const handles = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) {
    handles.add(m[1].toLowerCase());
  }
  return [...handles];
}

export async function findMentionedUsers(orgId: string, handles: string[]) {
  if (handles.length === 0) return [];

  const members = await prisma.orgMember.findMany({
    where: { orgId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });

  return members
    .map((m) => m.user)
    .filter((u) => {
      const nameKey = u.name.toLowerCase().replace(/\s+/g, "");
      const firstName = u.name.toLowerCase().split(/\s+/)[0];
      const emailPrefix = u.email.split("@")[0].toLowerCase();
      return handles.some(
        (h) => nameKey === h || firstName === h || emailPrefix === h,
      );
    });
}

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
};

export async function createNotifications(items: NotificationInput[]) {
  if (items.length === 0) return;
  await prisma.notification.createMany({ data: items });
}
