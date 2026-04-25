import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_PREFIX = /^(project|task|user):[a-z0-9]{20,40}$/;

async function canAccessChannel(userId: string, channel: string): Promise<boolean> {
  const [kind, id] = channel.split(":");

  if (kind === "user") {
    return id === userId;
  }

  if (kind === "project") {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { orgId: true },
    });
    if (!project) return false;
    const m = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId: project.orgId } },
      select: { id: true },
    });
    return Boolean(m);
  }

  if (kind === "task") {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { project: { select: { orgId: true } } },
    });
    if (!task) return false;
    const m = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId: task.project.orgId } },
      select: { id: true },
    });
    return Boolean(m);
  }

  return false;
}

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const channel = req.nextUrl.searchParams.get("channel") ?? "";
  if (!VALID_PREFIX.test(channel)) {
    return new Response("Bad channel", { status: 400 });
  }
  const ok = await canAccessChannel(session.userId, channel);
  if (!ok) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller closed
        }
      };

      send(`retry: 3000\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ channel })}\n\n`);

      unsubscribe = subscribe(channel, (event) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      heartbeat = setInterval(() => send(`: heartbeat\n\n`), 25_000);

      const onAbort = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
