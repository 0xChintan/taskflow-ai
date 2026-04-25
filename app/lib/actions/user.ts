"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import {
  PasswordSchema,
  ProfileSchema,
  type PasswordFormState,
  type ProfileFormState,
} from "@/lib/validation";

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { userId } = await verifySession();

  const parsed = ProfileSchema.safeParse({
    name: formData.get("name"),
    avatarUrl: formData.get("avatarUrl") || undefined,
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl ?? null,
      timezone: parsed.data.timezone,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const { userId } = await verifySession();

  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { errors: { form: ["User not found."] } };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return { errors: { currentPassword: ["Incorrect current password."] } };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { ok: true };
}
