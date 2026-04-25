# Database

Postgres 14+ with [Prisma 7](https://www.prisma.io/docs/orm). Schema lives in [prisma/schema.prisma](../prisma/schema.prisma); migrations in [prisma/migrations/](../prisma/migrations/).

## Why Prisma 7 needs a special setup

Prisma 7 made two breaking changes from earlier versions:

1. **Datasource URL is no longer in `schema.prisma`.** It moved to a top-level [`prisma.config.ts`](../prisma.config.ts):

   ```ts
   import { defineConfig, env } from "prisma/config";
   import { config } from "dotenv";
   config({ path: [".env.local", ".env"] });

   export default defineConfig({
     schema: "prisma/schema.prisma",
     datasource: { url: env("DATABASE_URL") },
   });
   ```

2. **PrismaClient requires a driver adapter** to be passed at construction time:

   ```ts
   // lib/db.ts
   import { PrismaClient } from "@prisma/client";
   import { PrismaPg } from "@prisma/adapter-pg";

   const adapter = new PrismaPg(process.env.DATABASE_URL!);
   export const prisma = new PrismaClient({ adapter });
   ```

   We wrap the client in a `globalThis` singleton (standard Next.js dev-mode pattern) to survive HMR.

## Domain model

```
User ─┬─< OrgMember >─ Organization ─┬─< Project ─┬─< Task ─┬─< Comment ─┐
      │                              │            │         │            │
      │                              │            │         ├─< Attachment ┤  (also on Task directly)
      │                              │            │         │
      │                              │            │         └─< ActivityLog
      │                              │            │
      │                              │            └─< Sprint ──< Task (sprintId)
      │                              │
      │                              └─< Label
      │
      └─< Notification (per-user inbox)
```

## Models at a glance

| Model | Purpose | Notable fields |
|---|---|---|
| `User` | Account | `email` (unique), `passwordHash`, `name`, `avatarUrl`, `timezone` |
| `Organization` | Workspace | `slug` (globally unique), `color` (brand hex) |
| `OrgMember` | Membership | `role` enum (OWNER/ADMIN/MEMBER/VIEWER), `@@unique([userId, orgId])` |
| `Project` | Container of tasks | `key` (e.g. "PROJ"), `color`, `@@unique([orgId, key])` |
| `ProjectMember` | _Reserved._ Schema present, currently unused — access flows through OrgMember |
| `Sprint` | Time-boxed iteration | `isActive` (only one per project at a time) |
| `Task` | Work item | `number` (autoincrement per project, used in URL like PROJ-42), `order` (LexoRank float for kanban position) |
| `Comment` | Threaded under task | `body` (plain text + `@mentions`), `editedAt` |
| `Attachment` | File reference | Polymorphic — has nullable `taskId` and `commentId` |
| `ActivityLog` | Audit trail | `meta` JSON for diff payloads |
| `Notification` | Per-user inbox | `isRead`, `linkUrl` |
| `Label` | _Reserved._ Schema present, no UI yet |

## Cascade behavior

The schema is opinionated about cascades — deletes propagate downward:

| Delete | Cascades to |
|---|---|
| `User` | (Currently no cascade — would orphan content. Account deletion is deferred for this reason.) |
| `Organization` | `OrgMember`, `Project` (and everything inside it) |
| `Project` | `Sprint`, `Task` (and everything inside it), `Label` |
| `Task` | `Comment`, `Attachment` (where taskId), `ActivityLog` |
| `Comment` | `Attachment` (where commentId) |
| `Sprint` | Tasks have their `sprintId` set to `null` (we do this manually before deleting — see [sprints.ts](../app/lib/actions/sprints.ts)) |

**Note**: file blobs in `public/uploads/` are NOT removed by FK cascades. The [storage doc](storage.md) covers the orphan-cleanup tradeoff.

## Indexes

Selective indexes are defined for hot paths:

```prisma
model Task {
  @@index([projectId, status])       // kanban groups
  @@index([assigneeId])              // "my tasks" filter
  @@index([dueDate])                 // overdue queries
  @@unique([projectId, number])      // PROJ-42 lookup + auto-increment safety
}

model ActivityLog {
  @@index([projectId, createdAt])    // project activity feed
  @@index([entityId])                // task-scoped activity feed
}

model Notification {
  @@index([userId, isRead])          // unread badge count
}

model OrgMember {
  @@unique([userId, orgId])          // membership lookup
  @@index([orgId])                   // members list
}
```

## Two clever bits worth understanding

### 1. Task numbers (PROJ-42)

Each project has its own counter. We don't use Postgres sequences because the counter scope is per-project, not global.

```ts
// Inside createTask:
async function nextTaskNumber(projectId: string) {
  const last = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}
```

Race condition: two tasks created at the same instant could both compute the same `next`. The `@@unique([projectId, number])` constraint will reject the loser with `P2002`. The [tasks.ts action](../app/lib/actions/tasks.ts) wraps this in a 3-attempt retry loop.

### 2. LexoRank-style float ordering

Kanban cards need to maintain order within a column. Naive integer `order` (1, 2, 3, …) means inserting between two cards rewrites every subsequent row. Instead we use **floating-point gaps**:

```ts
// lib/order.ts
export function getOrderBetween(before?: number | null, after?: number | null) {
  if (before == null && after == null) return 1000;
  if (before == null) return after! / 2;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}
```

Inserting between cards with order `1000` and `2000` gives `1500`. Re-inserting between `1000` and `1500` gives `1250`. After ~50 inserts at the same spot, floating-point precision becomes a concern — for production, run a periodic re-balance job that re-spreads the orders. Not yet implemented.

## Migrations

```bash
# Create + apply a new migration in dev
npx prisma migrate dev --name what_changed

# Apply existing migrations in prod
npx prisma migrate deploy

# Regenerate the typed client after a schema change
npx prisma generate

# Browse data
npx prisma studio
```

Migration files are checked into [prisma/migrations/](../prisma/migrations/). Always commit them alongside the schema change.

## Querying patterns used in this codebase

### Parallel reads in layouts

```ts
const [user, activeOrg, orgs] = await Promise.all([
  getCurrentUser(),
  getActiveOrg(),
  getOrgsForUser(),
]);
```

### `select` everything you need, avoid full objects

```ts
prisma.task.findMany({
  where: { projectId },
  select: {
    id: true,
    number: true,
    title: true,
    status: true,
    assignee: { select: { id: true, name: true } },
  },
});
```

This both shrinks payloads and acts as a soft DTO — fields you didn't `select` can't accidentally leak.

### `groupBy` for analytics

```ts
prisma.task.groupBy({
  by: ["status"],
  where: { projectId },
  _count: true,
});
```

Used in [analytics/page.tsx](../app/(app)/projects/%5Bid%5D/analytics/page.tsx) for the status donut.

### Transactions when consistency matters

```ts
// Auth signup creates user + org + membership atomically
await prisma.$transaction(async (tx) => {
  const created = await tx.user.create({...});
  const org = await tx.organization.create({...});
  await tx.orgMember.create({ userId: created.id, orgId: org.id, role: "OWNER" });
  return created;
});
```

If any step fails, the whole transaction rolls back and the user doesn't exist in a half-created state.

### `cache()` wrapping in the DAL

```ts
import { cache } from "react";

export const verifySession = cache(async () => { ... });
export const getCurrentUser = cache(async () => { ... });
```

React's `cache()` memoizes for the duration of one render pass. So if a layout and a page both call `verifySession()` during the same request, only one DB round-trip happens.
