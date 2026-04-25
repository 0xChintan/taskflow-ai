import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

type LogArgs = {
  action: string;
  entityType: "task" | "project" | "comment";
  entityId: string;
  meta: Prisma.InputJsonValue;
  userId: string;
  projectId: string;
  taskId?: string | null;
};

export async function logActivity(args: LogArgs) {
  await prisma.activityLog.create({
    data: {
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      meta: args.meta,
      userId: args.userId,
      projectId: args.projectId,
      taskId: args.taskId ?? null,
    },
  });
}
