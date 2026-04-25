import { z } from "zod";
import { Priority, Role, TaskStatus } from "@prisma/client";

export const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  email: z.email({ message: "Enter a valid email." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters." })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." }),
});

export const LoginSchema = z.object({
  email: z.email({ message: "Enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { message: "Password is required." }),
});

export const OrgSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(60).trim(),
});

const KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;

export const ProjectSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(80).trim(),
  key: z.string().regex(KEY_REGEX, {
    message: "2–10 chars, uppercase letters and digits, must start with a letter.",
  }),
  description: z.string().max(2000).trim().optional().or(z.literal("").transform(() => undefined)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "Pick a valid color." }),
});

export const InviteSchema = z.object({
  email: z.email({ message: "Enter a valid email." }).trim().toLowerCase(),
  role: z.enum(Role).default(Role.MEMBER),
});

export type AuthFormState =
  | { errors?: { name?: string[]; email?: string[]; password?: string[]; form?: string[] } }
  | undefined;

export type OrgFormState =
  | { errors?: { name?: string[]; form?: string[] }; ok?: boolean }
  | undefined;

export type ProjectFormState =
  | {
      errors?: {
        name?: string[];
        key?: string[];
        description?: string[];
        color?: string[];
        form?: string[];
      };
      ok?: boolean;
    }
  | undefined;

export type InviteFormState =
  | { errors?: { email?: string[]; role?: string[]; form?: string[] }; ok?: boolean }
  | undefined;

const optionalString = z.string().trim().optional().or(z.literal("").transform(() => undefined));

export const TaskCreateSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(200).trim(),
  status: z.enum(TaskStatus).default(TaskStatus.TODO),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(200).trim(),
  description: optionalString,
  status: z.enum(TaskStatus),
  priority: z.enum(Priority),
  assigneeId: optionalString,
  storyPoints: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? undefined : Number(v)))
    .refine((v) => v == null || (Number.isInteger(v) && v >= 0 && v <= 999), {
      message: "Story points must be 0–999.",
    }),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? undefined : new Date(v)))
    .refine((v) => v == null || !Number.isNaN(v.getTime()), {
      message: "Invalid date.",
    }),
});

export type TaskFormState =
  | {
      errors?: {
        title?: string[];
        description?: string[];
        status?: string[];
        priority?: string[];
        assigneeId?: string[];
        storyPoints?: string[];
        dueDate?: string[];
        form?: string[];
      };
      ok?: boolean;
    }
  | undefined;

export function suggestProjectKey(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? words.slice(0, 4).map((w) => w[0]).join("")
    : trimmed.slice(0, 4);
  return initials.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "PROJ";
}

export function suggestOrgSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "org";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
