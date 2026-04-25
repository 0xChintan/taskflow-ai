# Authentication & Authorization

TaskFlow uses email/password auth with stateless JWT sessions in HTTP-only cookies. There's no third-party auth provider — everything is in-process.

## Stack

- **Password hashing**: `bcryptjs` (cost factor 10)
- **Session token**: `jose` library, JWT signed with HS256
- **Storage**: HTTP-only `Secure` cookie (set on the response, never accessible to JS)
- **Session lifetime**: 7 days, sliding (not implemented yet — see "Session refresh" below)

## Session lifecycle

```
┌─────────┐    POST signup           ┌──────────────────┐
│ Browser │ ────────────────────────▶│  signup action   │
└─────────┘                          │  bcrypt.hash     │
                                     │  prisma.create   │
                                     │  createSession() │
                                     └──────────┬───────┘
                                                │
                                     ┌──────────▼──────────────┐
                                     │  Set-Cookie: session=…  │
                                     │  redirect /dashboard    │
                                     └─────────────────────────┘

┌─────────┐    GET /dashboard         ┌──────────────────┐
│ Browser │   Cookie: session=… ─────▶│ proxy.ts         │
└─────────┘                          │ readSession()    │
                                     │ → if invalid:    │
                                     │   307 → /login   │
                                     └──────────┬───────┘
                                                │ ok
                                     ┌──────────▼──────────┐
                                     │ /dashboard renders  │
                                     │ verifySession()     │
                                     │ getCurrentUser()    │
                                     └─────────────────────┘
```

## Files

| File | Role |
|---|---|
| [lib/session.ts](../lib/session.ts) | `encrypt()`, `decrypt()`, `createSession()`, `deleteSession()`, `readSession()` — the cookie + JWT primitives |
| [lib/dal.ts](../lib/dal.ts) | The Data Access Layer — `verifySession`, `getCurrentUser`, `requireOrgRole`, `requireProjectAccess` |
| [proxy.ts](../proxy.ts) | Cheap first-pass gate at the edge — redirects unauthed users away from protected routes |
| [app/lib/actions/auth.ts](../app/lib/actions/auth.ts) | `signup`, `login`, `logout` server actions |
| [app/(auth)/](../app/%28auth%29/) | Login + signup pages (a route group with a different layout — no app shell) |

## The two-layer authorization model

### Layer 1: Proxy (optimistic edge gate)

[proxy.ts](../proxy.ts) runs on every request before the App Router resolves the route. It only does cheap cookie work — no DB queries:

```ts
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("session")?.value;
  const session = await decrypt(token);
  const isAuthed = Boolean(session?.userId);
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!isAuthed && !isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}
```

This is fast (just JWT verify, no DB) and catches the common case. It is **not** the security model — it's just a UX optimization to avoid serving the dashboard skeleton to logged-out users.

> Note: in Next.js 16 the file is `proxy.ts`, not `middleware.ts`. The middleware convention is deprecated.

### Layer 2: DAL (the actual security)

Every page, layout, and server action that accesses protected data calls a DAL function. These are the source of truth:

```ts
// lib/dal.ts

// Returns { userId } or redirects to /login
export const verifySession = cache(async () => {
  const session = await readSession();
  if (!session?.userId) redirect("/login");
  return { userId: session.userId };
});

// Throws if user can't access the project's org
export async function requireProjectAccess(projectId: string) {
  const { userId } = await verifySession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, orgId: true, /* ... */ },
  });
  if (!project) throw new Error("Not found");
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId: project.orgId } },
  });
  if (!member) throw new Error("Forbidden");
  return { project, role: member.role };
}

// Throws if user doesn't have one of the given roles in the org
export async function requireOrgRole(orgId: string, ...allowed: Role[]) {
  const { userId } = await verifySession();
  const member = await prisma.orgMember.findUnique({...});
  if (!member || !allowed.includes(member.role)) throw new Error("Forbidden");
  return member.role;
}
```

`cache()` from React memoizes within a single render pass — so if a layout, a page, and three components all call `verifySession()`, the DB hit only happens once.

## Roles

| Role | Powers |
|---|---|
| `OWNER` | Everything — including org delete, role changes, member removal |
| `ADMIN` | Manage org settings + members + projects, can't demote/remove other owners |
| `MEMBER` | Create projects + tasks + comments, manage own tasks |
| `VIEWER` | Read-only |

Role checks happen server-side in actions:

```ts
export async function deleteProject(projectId: string) {
  const { project } = await requireProjectAccess(projectId);
  await requireOrgRole(project.orgId, Role.OWNER, Role.ADMIN);
  // ... safe to delete
}
```

The UI also hides controls non-allowed users wouldn't be able to use, but that's UX polish — the server check is what enforces.

## Active organization

Users can belong to multiple orgs. The "active" one is tracked in a separate HTTP-only cookie (`active-org`), set by the org switcher:

```ts
// Switching orgs
await setActiveOrgCookie(orgId);

// Reading the active org
export const getActiveOrg = cache(async () => {
  const orgs = await getOrgsForUser();
  if (orgs.length === 0) return null;
  const store = await cookies();
  const preferredId = store.get("active-org")?.value;
  return orgs.find((o) => o.id === preferredId) ?? orgs[0];
});
```

If the cookie points to an org the user no longer belongs to (e.g., they got removed), it falls back to the first org. No "active org missing" error case to handle in pages.

## Signup creates a workspace

To avoid the empty-state cliff, signup atomically creates a personal workspace named "<Name>'s Workspace" and makes the user `OWNER`:

```ts
const user = await prisma.$transaction(async (tx) => {
  const created = await tx.user.create({ data: { name, email, passwordHash } });
  const org = await tx.organization.create({
    data: { name: `${created.name}'s Workspace`, slug: suggestOrgSlug(created.name) },
  });
  await tx.orgMember.create({ data: { userId: created.id, orgId: org.id, role: Role.OWNER } });
  return created;
});
```

The transaction means a partial failure (org create errors, etc.) rolls back the user too — no zombie accounts.

## Things deferred

- **Session refresh / sliding expiry** — currently the cookie is set with a fixed 7-day expiry. A returning user past day 7 has to log in again. Easy to add a "refresh on each request" middleware step.
- **Password reset flow** — needs an email provider. The schema has a `refreshToken` field on User left over from an earlier draft; not currently used.
- **2FA / TOTP** — schema does not have a TOTP secret yet. Adding it would require a Trusted-Devices model.
- **OAuth (Google, GitHub)** — significant scope; not started.
- **Email-based invites** — invite member only works for users who already have an account. Real invites need an email provider (Resend / Postmark).
- **Account deletion** — needs cascade strategy for content; specifically, sole org owners must transfer ownership before deleting.
