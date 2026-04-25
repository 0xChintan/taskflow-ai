# Roadmap

High-value features beyond what's already shipped, with concrete implementation hints that map to the current codebase. Ordered by **impact**; effort estimates are rough.

Legend:
- ✅ **Shipped** — already in main, may have polish gaps
- 🟡 **Partial** — partially in code, more to do
- 🔵 **Planned** — designed but not implemented
- ⚪ **Idea** — worth exploring

---

## 1. Sprint planning & velocity tracking 🟡

> Sprint planner view where you drag tasks from backlog into sprints, track story points committed vs completed, auto-generate velocity charts across sprints.

**What's done**: Sprint model, create/start/complete/delete actions, story-point assignment per task, sprint pill on kanban cards, velocity chart on Analytics ([docs/database.md](database.md)). Tasks can be moved into a sprint via the **Sprint** dropdown on the task Edit tab.

**What's missing**:
- Drag-from-backlog UX — a dedicated sprint-planning view with two columns (backlog ↔ sprint) and DnD between them
- "Committed points" snapshot at sprint start (currently we only know what's in the sprint *now*, not what was there at the start)
- Burndown chart for the active sprint (currently only cumulative completion)
- Sprint retrospective notes (could be a `Sprint.retrospective` text field)

**Implementation hints**:
- Add `Sprint.committedPoints` (Int) — set when `startSprint()` runs (sum of current task points)
- New page `/projects/[id]/sprints/[sprintId]` with two `<SortableContext>` columns sharing one `<DndContext>`
- Burndown: `Sprint.committedPoints` minus completed-by-day; ideal line is linear from start to end
- Effort: **1–2 weeks**

---

## 2. @mentions with rich notifications ✅

> Parse comments for @username patterns on save, create targeted notifications, highlight mentions in the thread.

**Status**: Shipped. See [lib/notifications.ts](../lib/notifications.ts) — `extractMentions` + `findMentionedUsers` resolve `@firstname` / `@fullname` / `@email-prefix`. Mentions create `comment.mention` notifications with realtime push, and the comment renderer highlights mention chips in brand color.

**Polish ideas** (not blocking):
- Typeahead popover on `@` in the composer (currently users have to know the exact handle)
- `@channel` / `@here` for project-wide mentions
- Notification when someone reacts to your comment (no reactions yet — see "Comment reactions" below)

---

## 3. Time tracking 🔵

> TimeEntry model (userId, taskId, startedAt, endedAt, note). Timer button on task cards. Weekly/monthly time reports per user and project.

**Schema**:
```prisma
model TimeEntry {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  startedAt DateTime
  endedAt   DateTime?    // null while running
  note      String?
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, startedAt])
  @@index([taskId])
}
```

**Implementation hints**:
- Add `startTimer(taskId)` / `stopTimer()` server actions in `app/lib/actions/time.ts`
- Constraint: a user can only have one running entry at a time (close any open entry before starting a new one)
- Show a small timer icon on task cards when there's an active timer
- New `/projects/[id]/time` tab with a stacked-bar chart per user per week
- Realtime publish to `user:<id>` so the timer state syncs across tabs
- Effort: **1 week**

---

## 4. Custom fields 🔵

> CustomField model (projectId, name, type: text | number | date | select) with a TaskCustomValue join table. Teams define their own metadata without schema changes.

**Schema**:
```prisma
enum CustomFieldType { TEXT NUMBER DATE SELECT }

model CustomField {
  id        String          @id @default(cuid())
  projectId String
  name      String
  type      CustomFieldType
  options   Json?           // for SELECT: array of strings
  order     Int

  project   Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  values    TaskCustomValue[]

  @@unique([projectId, name])
}

model TaskCustomValue {
  id      String      @id @default(cuid())
  taskId  String
  fieldId String
  value   String      // serialized; parsed by type

  task    Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  field   CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  @@unique([taskId, fieldId])
}
```

**Implementation hints**:
- New page `/projects/[id]/settings` → "Custom fields" section to define fields
- Render dynamic fields in the task Edit form below the built-ins
- Filter bar gains a "Custom field" filter (per-project)
- Validate per type in the action (`Number(value)` etc.)
- Effort: **2 weeks** (UI is the bulk)

---

## 5. Public project roadmap 🔵

> Shareable, read-only board view for stakeholders — no login required, controlled by a signed URL.

**Schema**:
```prisma
model PublicShare {
  id        String   @id @default(cuid())
  projectId String
  token     String   @unique     // signed/random
  expiresAt DateTime?
  createdAt DateTime @default(now())
  createdBy String

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Implementation hints**:
- New route `/share/[token]` outside the `(app)` group — no proxy auth check
- Read-only renderer that calls `prisma.project.findUnique` by way of the share token
- Toggle in project Settings: "Public roadmap" → generates a signed URL
- Optional: bcrypt-hashed password gate
- Effort: **1 week**

---

## 6. AI commit message linker 🔵

> GitHub/GitLab webhook that receives push events, parses commit messages for task IDs (e.g. `MOB-42`), and auto-logs activity on the matching task.

**Implementation hints**:
- New route handler `app/api/webhooks/github/route.ts` with HMAC signature verification
- Parse commit message regex `\b([A-Z]+-\d+)\b` to find task references
- For each match: lookup task by `(project.key, task.number)`, append an `activity.commit_linked` entry with the commit URL + first line of the message + author
- Could optionally use Claude to summarize a long diff and add it to the activity meta
- Settings page per project to add the webhook URL/secret
- Effort: **1 week**

---

## 7. Recurring tasks 🔵

> A `recurrence` field on Task (cron expression). A scheduled job fires at the time and clones the task.

**Schema**:
```prisma
model Task {
  // ...existing fields...
  recurrence       String?    // cron expression
  recurrenceParent String?    // points back to the original
  recurrenceParentTask Task?  @relation("Recurrence", fields: [recurrenceParent], references: [id])
  recurrenceClones Task[]     @relation("Recurrence")
}
```

**Implementation hints**:
- Use a job runner — for in-process: `node-cron`. For multi-instance / serverless: BullMQ + Redis, or a per-second cron lookup cron
- On fire: clone the task with reset status (BACKLOG / TODO), null `completedAt`, link via `recurrenceParent`
- Display a small ↻ icon on cards that are part of a recurring series
- Effort: **1 week**

---

## 8. CSV / Excel import 🔵

> Bulk task import from a spreadsheet. Essential for teams migrating from spreadsheet-based tracking.

**Implementation hints**:
- New page `/projects/[id]/import`
- Use `papaparse` (CSV) or `xlsx` (Excel) client-side, send parsed JSON to the server action
- Field mapping UI: detect headers, let user map "Title", "Status", "Assignee email", "Priority", "Story points"
- Validate per row, show a preview with errors highlighted before commit
- Bulk-create with a single `prisma.task.createMany` call (after looking up assignees by email)
- Auto-number tasks correctly (continue the project's counter)
- Effort: **3–5 days**

---

## 9. Two-factor authentication 🔵

> TOTP support (speakeasy + QR code) as an optional security layer for org admins.

**Schema**:
```prisma
model User {
  // ...
  totpSecret      String?
  totpEnabled     Boolean  @default(false)
  totpBackupCodes String[]  // hashed
}
```

**Implementation hints**:
- `speakeasy.generateSecret()` to set up; show a QR via `qrcode` npm package
- Verify a 6-digit code before enabling
- Update login flow: after password, if `totpEnabled` then redirect to `/login/2fa` and require code
- Generate 10 single-use backup codes (bcrypt-hashed)
- Effort: **3–5 days**

---

## 10. Audit log export 🔵

> Admins download the full `ActivityLog` as CSV filtered by date range.

**Implementation hints**:
- New route handler `app/api/orgs/[id]/audit-export/route.ts`
- Query `ActivityLog` joined with User/Project across the org's date range
- Stream as CSV via `Response` with `Content-Type: text/csv` and `Content-Disposition: attachment`
- For very long exports: stream row-by-row instead of building the whole CSV in memory
- Per-org permission: OWNER only
- Effort: **1–2 days**

---

## Other ideas worth considering

| Feature | Why | Effort |
|---|---|---|
| **Subtasks** (UI for the existing `parentTaskId` field) | Already in schema, no UI yet | 2–3 days |
| **Labels** (UI for the existing `Label` model) | Schema is there; needs CRUD + filter | 2 days |
| **Comment reactions** (👍 / ✅ / 👀) | Lightweight engagement signal | 1 day |
| **Markdown rendering in comments** (currently plain text) | Better DX for technical notes | 1 day (`react-markdown` + `remark-gfm`) |
| **Mention typeahead** (`@` triggers a popover) | Reduces guess-the-handle friction | 2–3 days |
| **Email delivery** for notifications and invites (Resend) | Currently in-app only | 3–5 days |
| **Account deletion** (with sole-owner protection) | Compliance requirement | 2–3 days |
| **Real Cloudinary swap** for attachments | Production-ready file storage | 1 day (driver swap, see [storage doc](storage.md)) |
| **Redis pub/sub** for realtime broker | Multi-instance scaling | 1 day (file swap, see [realtime doc](realtime.md)) |
| **Mobile kanban view** (column cycler) | Board is unusable on phones today | 3 days |
| **AI task breakdown** (suggest subtasks) | Builds on existing AI integration | Needs subtask UI first |
| **AI prioritization** | Builds on existing AI integration | 2 days once decisions about UX |
| **Daily AI recommendations** (what to work on today) | Personal productivity loop | 3–4 days |
| **Search** (global, across orgs) | Schema is indexable; no UI | 2–3 days |
| **Keyboard shortcuts** (`c` to create, `/` to search) | Power-user feel | 2 days |
| **Project templates** (save a project as a template) | Speeds up team onboarding | 1 week |
| **Webhooks out** (org-level, fire on task events) | Integration story | 1 week |
| **API tokens + REST API** | Third-party integrations | 2 weeks |
| **SSO (SAML / OIDC)** | Enterprise gate | 2–3 weeks |
| **Audit-grade activity feed** (per-org timeline view) | Compliance | 3 days |

---

## Architecture notes

The current architecture is set up so most of these slot in cleanly:

- **New mutations** → add a file in [app/lib/actions/](../app/lib/actions/) following the [server-actions patterns doc](server-actions.md)
- **New schema** → edit [prisma/schema.prisma](../prisma/schema.prisma), `npx prisma migrate dev`, regenerate client (see [database doc](database.md))
- **New realtime channels** → publish from your action; subscribers drop in `<RealtimeRefresh channel="..." />` (see [realtime doc](realtime.md))
- **New route** → add a folder in [app/(app)/](../app/%28app%29/), add a `page.tsx`, optionally a `layout.tsx` for shared chrome
- **Auth & RBAC** → never trust the client; call `verifySession()` and `requireOrgRole()` / `requireProjectAccess()` at the top of every action and page (see [auth doc](auth.md))

Small features (1–3 days) usually touch 3–5 files: a schema migration (if needed), an action, a page, a couple of components. Big features (sprint planner, time tracking) are typically a new top-level page, a couple of new actions, a new model or two, and some UI primitives.
