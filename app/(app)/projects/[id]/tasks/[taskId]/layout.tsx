import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/dal";
import { TaskDetailNav } from "./_components/task-detail-nav";
import { RealtimeRefresh } from "@/app/(app)/_components/realtime-refresh";

export default async function TaskDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;

  let project;
  try {
    ({ project } = await requireProjectAccess(projectId));
  } catch {
    notFound();
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: {
      id: true,
      number: true,
      title: true,
      creator: { select: { name: true } },
    },
  });
  if (!task) notFound();

  const attachmentCount = await prisma.attachment.count({
    where: { taskId: task.id },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/projects/${project.id}`}
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
          Back to board
        </Link>
        <div className="mt-3 flex items-baseline gap-2">
          <h1 className="text-xl font-semibold tracking-tight truncate">{task.title}</h1>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tracking-wide rounded-md bg-subtle px-2 py-0.5">
            {project.key}-{task.number}
          </span>
          <span>·</span>
          <span>opened by {task.creator.name}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <TaskDetailNav
          projectId={project.id}
          taskId={task.id}
          attachmentCount={attachmentCount}
        />
        <div className="p-6">{children}</div>
      </div>

      <RealtimeRefresh channel={`task:${task.id}`} />
    </div>
  );
}
