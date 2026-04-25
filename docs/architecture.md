# Architecture

TaskFlow is a single Next.js 16 App Router application — server, client, and API live in one process. The original spec described three tiers (client, API gateway, data); this document explains how those tiers map to Next.js primitives, and how a request flows through the system.

## Layer mapping

| Spec layer | Next.js implementation |
|---|---|
| **Client** (Vite + React) | React 19 client components — only the bits that need interactivity (`'use client'`). Drag-and-drop, dialogs, form state, the realtime subscriber. |
| **Render** (was server-rendered React) | React Server Components (the default in App Router). Pages, layouts, and feed components that read directly from Prisma. |
| **API gateway** (Express + REST) | **Server Actions** for mutations (form-style RPC over POST), **Route Handlers** only where a real HTTP API surface is needed (just `/api/realtime` so far). |
| **Auth middleware** | Next.js 16 **Proxy** ([proxy.ts](../proxy.ts)) — note: `proxy.ts` replaces `middleware.ts` in Next 16. Plus a server-side **DAL** in [lib/dal.ts](../lib/dal.ts) that re-checks every protected access close to the data. |
| **Data** (Postgres + Redis + Cloudinary + Socket.io) | **Postgres** via Prisma 7 with `@prisma/adapter-pg`. **Redis** is replaced by an in-memory pub/sub broker (single-process; swap to Redis for multi-instance — see [realtime.md](realtime.md)). **Cloudinary** is replaced by a local-disk driver behind a swappable interface (see [storage.md](storage.md)). **Socket.io** is replaced by SSE — much simpler, fits the unidirectional update use-case. |

## Folder layout (the why)

```
app/
├── (auth)/        ← Route group for unauthed pages. Has its own layout (centered card).
├── (app)/         ← Route group for authed pages. Layout fetches active org and
│                    sets --primary CSS variable as the brand color cascade root.
│   └── projects/[id]/
│       ├── layout.tsx   ← Re-overrides --primary with the project's color
│       │                  for everything inside a project's scope.
│       └── tasks/[taskId]/
│           ├── layout.tsx ← Holds the task header + 4-tab nav. Pages render the
│           │                tab-specific content.
│           ├── page.tsx       (Edit, default tab)
│           ├── activity/      (Activity tab)
│           ├── attachments/   (Attachments tab)
│           └── management/    (Management tab — delete)
├── api/realtime/  ← Only HTTP API surface — SSE stream for realtime updates.
└── lib/actions/   ← Server actions, organized by domain (auth, orgs, projects, ...).
                    Each file is `"use server"` at the top.
lib/               ← Server-only libs (`import 'server-only'` guard).
                    Pure modules: Prisma client, session, validation, broker, etc.
```

## Request flow: a typical authenticated page render

```
GET /projects/abc123/tasks/xyz789

1. Browser sends cookie: session=<JWT>
2. proxy.ts intercepts:
   - Reads `session` cookie, decrypts via lib/session.ts
   - If invalid/missing: 307 redirect to /login
   - Otherwise: NextResponse.next() (proxy is the optimistic gate)
3. Next.js App Router resolves the route tree:
   - app/(app)/layout.tsx              ← header + org color injection
     - app/(app)/projects/[id]/layout.tsx       ← project color override
       - app/(app)/projects/[id]/tasks/[taskId]/layout.tsx   ← tab nav
         - app/(app)/projects/[id]/tasks/[taskId]/page.tsx   ← Edit tab
4. Each layout/page:
   - Calls verifySession() (cached for the request) → re-validates cookie
   - Calls requireProjectAccess(projectId) → checks user is org member
   - Reads its data via Prisma directly (no fetch())
5. React renders Server + Client components, returns HTML stream
6. Client hydrates the interactive bits:
   - Kanban DnD listeners attach
   - <RealtimeRefresh> opens an EventSource to /api/realtime
```

The key point: **every page re-checks auth at the data layer**, not just at the proxy edge. The proxy is a fast first-pass gate; the DAL is the source of truth.

## Request flow: a mutation (server action)

```
User clicks "Save changes" on the task edit form

1. React serializes the form action call:
   POST /projects/.../tasks/[id]
   Headers: Next-Action: <hash-of-action>
   Body: <serialized FormData>
2. Next.js dispatches to the action function:
   updateTask(taskId, prevState, formData)
3. Action body:
   - verifySession() → throws redirect("/login") if invalid
   - requireProjectAccess(projectId) → throws if user can't access
   - Parse + validate via Zod schema
   - prisma.task.update(...)
   - logActivity(...)        ← write to ActivityLog
   - publish(channels.project(...), "task.updated")  ← realtime fanout
   - revalidatePath(...)     ← invalidate Next's cache for the URL
   - return { ok: true } OR redirect(...)
4. React applies the response:
   - If returned state, useActionState updates form UI
   - If redirect, client navigates
   - revalidatePath causes the next render to re-fetch
5. Other tabs subscribed to the project channel:
   - SSE event arrives → <RealtimeRefresh> calls router.refresh()
   - Server re-renders the tree with fresh Prisma data
```

This means a mutation never needs to be wired to a list of consumers — the broker fans it out, and `router.refresh()` handles the rest.

## What lives where

| Concern | File(s) |
|---|---|
| Auth gate (cookie cheap-check) | [proxy.ts](../proxy.ts) |
| Auth source of truth | [lib/dal.ts](../lib/dal.ts) — `verifySession`, `requireOrgRole`, `requireProjectAccess` |
| Session creation/destruction | [lib/session.ts](../lib/session.ts) — jose JWT in HTTP-only cookie |
| All mutating logic | [app/lib/actions/](../app/lib/actions/) — one file per domain |
| All Zod schemas | [lib/validation.ts](../lib/validation.ts) |
| Data model | [prisma/schema.prisma](../prisma/schema.prisma) |
| Prisma client (singleton) | [lib/db.ts](../lib/db.ts) |
| Realtime broker | [lib/realtime.ts](../lib/realtime.ts) |
| SSE endpoint | [app/api/realtime/route.ts](../app/api/realtime/route.ts) |
| File storage driver | [lib/storage.ts](../lib/storage.ts) |
| AI integration | [lib/ai.ts](../lib/ai.ts) |
| Activity logging | [lib/activity.ts](../lib/activity.ts) |
| Notifications + mention parsing | [lib/notifications.ts](../lib/notifications.ts) |

## Design principles

1. **Re-check at the data boundary**, not just at the edge. The proxy is fast but not the security model — the DAL is.
2. **Server actions over REST** for internal UI mutations. Type-safe, skip a fetch + serialize layer, work with form progressive enhancement.
3. **Route handlers only where a true HTTP surface is needed.** `/api/realtime` exists because the browser EventSource API needs an HTTP endpoint — there's no Server Action equivalent for streaming.
4. **One Prisma query per concern, parallelized when independent.** `Promise.all([userQ, orgsQ, ...])` in layouts keeps round-trips down.
5. **CSS variables for theming**, not Tailwind config swaps. Org color is set on the app shell wrapper; project color cascades over it. Switching brand color is one HTML attribute change, not a CSS rebuild.
6. **Optimistic UI for drag-and-drop**, server-truth on every other mutation. Comment posts, attachment uploads, etc. let the action complete then re-render — simpler and good enough.
7. **In-memory broker for dev, swap to Redis for prod.** The broker shape is generic enough that the swap is one file.
