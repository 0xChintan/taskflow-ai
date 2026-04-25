"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { channels, publish } from "@/lib/realtime";

export async function markNotificationRead(notificationId: string) {
  const { userId } = await verifySession();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  publish(channels.user(userId), "notification.added");
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { userId } = await verifySession();
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  publish(channels.user(userId), "notification.added");
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
