# Server Actions

All mutations in TaskFlow go through React **Server Actions** — async functions on the server that the client invokes via a special POST. There are zero hand-written REST endpoints (except `/api/realtime`, which exists because `EventSource` needs an HTTP URL).

## Why server actions over REST

- **Type safety end-to-end.** The action signature `(formData: FormData) => Promise<State>` is shared between client and server — no DTO drift.
- **Less code.** No router definition, no fetch wrapper, no JSON serialization layer.
- **Progressive enhancement.** Forms with `<form action={createTask}>` work without JS — the browser submits, the server responds with the new HTML.
- **Built-in pending state.** `useActionState()` returns `[state, action, pending]` — no manual loading flags.

## File layout

One file per domain in [app/lib/actions/](../app/lib/actions/):

```
auth.ts            → signup, login, logout
user.ts            → updateProfile, changePassword
orgs.ts            → createOrg, switchOrg, updateOrg, inviteMember,
                     changeMemberRole, removeMember, deleteOrg
projects.ts        → createProject, updateProject, deleteProject
tasks.ts           → createTask, updateTask, moveTask, deleteTask
sprints.ts         → createSprint, startSprint, completeSprint, deleteSprint
comments.ts        → createComment, updateComment, deleteComment
attachments.ts     → uploadTaskAttachments, deleteAttachment
notifications.ts   → markNotificationRead, markAllNotificationsRead
ai.ts              → generateTaskDescription, generateProjectInsights
```

Every file starts with `"use server"`. Functions exported from such a file are server actions and can be imported by client components.

## The standard action shape

Most write actions follow this pattern:

```ts
"use server";

export async function updateThing(
  thingId: string,                          // bound arg from .bind() on the client
  _prev: ThingFormState,                    // previous useActionState state
  formData: FormData,
): Promise<ThingFormState> {
  // 1. Auth + RBAC at the boundary
  const { userId } = await verifySession();
  await requireSomeAccess(thingId);

  // 2. Parse + validate input with Zod
  const parsed = ThingSchema.safeParse({
    field: formData.get("field"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  // 3. Mutate
  await prisma.thing.update({...});

  // 4. Side effects (in this order)
  await logActivity({...});                 // audit trail
  publish(channels.scope(...), "type");     // realtime fanout
  revalidatePath("/relevant/url");          // invalidate Next cache

  // 5. Return — either feedback state or redirect
  return { ok: true };
  // OR: redirect("/elsewhere");
}
```

This is the consistent recipe across the codebase. New actions should follow it.

## Calling from client components

Three ways to invoke:

### Form submission (preferred — supports progressive enhancement)

```tsx
'use client';
import { useActionState } from "react";
import { createTask } from "@/app/lib/actions/tasks";

export function NewTaskForm({ projectId }: { projectId: string }) {
  const action = createTask.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <input name="title" required />
      {state?.errors?.title && <p>{state.errors.title[0]}</p>}
      <button disabled={pending}>{pending ? "Creating…" : "Create"}</button>
    </form>
  );
}
```

The `bind(null, projectId)` is the standard pattern for passing extra args (the `projectId` becomes the action's first parameter).

### Plain async invocation (for buttons that don't fit a form)

```tsx
'use client';
import { useTransition } from "react";
import { startSprint } from "@/app/lib/actions/sprints";

export function StartSprintButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button onClick={() => startTransition(() => startSprint(id))} disabled={pending}>
      {pending ? "…" : "Start"}
    </button>
  );
}
```

`useTransition` keeps the click responsive while the server work runs.

### Server-rendered form (no client component needed)

```tsx
// in a Server Component
<form action={logout}>
  <button type="submit">Sign out</button>
</form>
```

This works because the action is referenced statically — Next.js generates the right wiring without any client JS.

## Validation

Every action that takes input validates with Zod first. All schemas live in [lib/validation.ts](../lib/validation.ts) so they're reused across actions and (in some cases) UI hints.

```ts
export const ProjectSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
  description: optionalString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

// In the action:
const parsed = ProjectSchema.safeParse({...});
if (!parsed.success) {
  return { errors: z.flattenError(parsed.error).fieldErrors };
}
```

`z.flattenError()` is the Zod 4 replacement for the deprecated `error.flatten()` method — it returns `{ formErrors, fieldErrors }`. The `fieldErrors` shape (`{ [fieldName]: string[] }`) maps directly to per-field UI rendering.

## State return shape

Every action returns a plain object the form can consume:

```ts
type FormState =
  | undefined                                              // initial
  | { errors?: { [field: string]: string[] }; ok?: boolean };
```

`undefined` for the first render, `{ errors }` if validation failed, `{ ok: true }` on success (so the form can clear/show a checkmark), or `redirect(...)` if the action navigates.

## Error handling philosophy

Server actions handle three error categories differently:

| Category | Handling | Example |
|---|---|---|
| **Validation** | Return `{ errors }`, render inline | "Name must be at least 2 characters" |
| **Authorization** | `throw` — Next.js catches and shows 500 | User trying to delete a project they don't own |
| **Network / DB** | `try/catch` only when we have a recovery; otherwise let it bubble | `P2002` unique violation we can retry |

For uniqueness conflicts we surface a clean error rather than letting Prisma's stack trace leak:

```ts
try {
  await prisma.project.create({...});
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { errors: { key: ["A project with this key already exists."] } };
  }
  throw e;
}
```

## Side effects in actions

After a successful mutation, every action does (some subset of):

1. **`logActivity(...)`** — write to the `ActivityLog` table for the audit feed
2. **`publish(channels.scope(...), eventType)`** — broadcast to the realtime broker
3. **`revalidatePath(...)`** — invalidate Next.js's render cache for affected URLs
4. **`createNotifications([...])`** — fan out per-user notifications

The order matters slightly: log + DB mutation first (so they're persistent), then publish (best-effort, no DB write), then revalidatePath. If publish fails, the data is still correct.

## Security considerations

> Server Actions are reachable via direct POST requests, not just through your application's UI. **Always verify authentication and authorization inside every Server Action.**

This is repeated in the Next.js docs and worth restating here. We do this two ways:

1. **`verifySession()` at the top of every action** — never trust that the user is authenticated.
2. **`requireOrgRole()` / `requireProjectAccess()` before any mutation** — never trust that the user can do this thing.

The DAL functions throw on failure, which Next.js converts into a clean 500 (or a redirect to login). Callers don't need to handle this — it's a safety net.

## A worked example

[app/lib/actions/tasks.ts](../app/lib/actions/tasks.ts) — `createTask`:

```ts
export async function createTask(
  projectId: string,        // bound arg
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { userId } = await verifySession();
  await requireProjectAccess(projectId);

  const parsed = TaskCreateSchema.safeParse({
    title: formData.get("title"),
    status: formData.get("status") || TaskStatus.TODO,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { title, status } = parsed.data;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [number, order] = await Promise.all([
        nextTaskNumber(projectId),
        nextOrderForColumn(projectId, status),
      ]);
      const task = await prisma.task.create({
        data: { title, status, order, number, projectId, creatorId: userId },
      });
      await logActivity({
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        meta: { title: task.title, number: task.number },
        userId,
        projectId,
        taskId: task.id,
      });
      publish(channels.project(projectId), "task.created", { taskId: task.id });
      revalidatePath(`/projects/${projectId}`);
      return { ok: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        attempt < 2
      ) {
        continue;  // retry on race-loss
      }
      throw e;
    }
  }
  return { errors: { form: ["Could not create task. Try again."] } };
}
```

This shows every pattern in one function: auth, RBAC, validation, optimistic concurrency, activity log, realtime publish, cache revalidation, structured error return.
