# Real-time updates

TaskFlow pushes mutations to other tabs via **Server-Sent Events** over an in-memory pub/sub broker. No Socket.io, no Pusher/Ably, no separate process — just a `ReadableStream` from a Route Handler and a single shared `Map<string, Set<Listener>>`.

## Why SSE (not WebSockets)

| | SSE | WebSocket |
|---|---|---|
| Direction | Server → client only | Bi-directional |
| Transport | Plain HTTP | WebSocket protocol |
| Reconnect | Built into `EventSource` | Manual |
| Works with our use case | ✅ Yes — UI just needs to know "something changed" | Overkill |
| Code complexity | ~80 lines for the route + broker | Need a WS server, ping/pong, reconnect logic |

We never need the client to push messages over the realtime channel — clicks become server actions, which fire publishes server-side. So we never need bidirectional. SSE wins on simplicity.

## The three pieces

### 1. The broker — [lib/realtime.ts](../lib/realtime.ts)

A `Map<channel, Set<listener>>` pinned to `globalThis` so it survives Next.js HMR in dev:

```ts
const globalForBroker = globalThis as unknown as { __realtimeBroker?: Broker };

function getBroker(): Broker {
  if (!globalForBroker.__realtimeBroker) {
    globalForBroker.__realtimeBroker = { channels: new Map() };
  }
  return globalForBroker.__realtimeBroker;
}

export function subscribe(channel: string, listener: Listener): () => void {
  const broker = getBroker();
  let set = broker.channels.get(channel);
  if (!set) {
    set = new Set();
    broker.channels.set(channel, set);
  }
  set.add(listener);
  return () => set!.delete(listener);
}

export function publish(channel: string, type: string, payload?: unknown) {
  const set = getBroker().channels.get(channel);
  if (!set || set.size === 0) return;
  const event = { channel, type, payload, at: Date.now() };
  for (const listener of set) {
    try { listener(event); } catch {}
  }
}
```

### 2. The SSE endpoint — [app/api/realtime/route.ts](../app/api/realtime/route.ts)

A Route Handler that returns a `ReadableStream` and registers a broker listener for the lifetime of the connection:

```ts
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const channel = req.nextUrl.searchParams.get("channel") ?? "";
  if (!VALID_PREFIX.test(channel)) return new Response("Bad channel", { status: 400 });
  if (!await canAccessChannel(session.userId, channel)) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch {}
      };

      send(`retry: 3000\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ channel })}\n\n`);

      const unsubscribe = subscribe(channel, (event) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => send(`: heartbeat\n\n`), 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",     // Disables nginx response buffering
    },
  });
}
```

Three things worth noting:

- **`retry: 3000`** at the top of the stream tells `EventSource` to wait 3s before reconnecting after a disconnect.
- **Heartbeat every 25s** — proxies (nginx, CDNs) often kill idle connections at 30-60s. The heartbeat is a comment line (`:`), which `EventSource` ignores.
- **`X-Accel-Buffering: no`** — explicit hint to nginx not to buffer the response.

### 3. The client subscriber — [app/(app)/_components/realtime-refresh.tsx](../app/%28app%29/_components/realtime-refresh.tsx)

A drop-in client component. Add `<RealtimeRefresh channel="..." />` to any server-rendered page and it auto-refreshes when an event arrives on that channel:

```tsx
"use client";

export function RealtimeRefresh({ channel }: { channel: string }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource(`/api/realtime?channel=${encodeURIComponent(channel)}`);

    function scheduleRefresh() {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 100);
    }

    for (const t of EVENT_TYPES) source.addEventListener(t, scheduleRefresh);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      source.close();
    };
  }, [channel, router]);

  return null;
}
```

`router.refresh()` re-renders the current Server Component tree on the server with fresh data, then patches the result into the live React tree without losing client state (form input values, scroll position, drag state, etc.).

The 100ms debounce coalesces bursts — when one mutation publishes to multiple channels, the client only refreshes once.

## Channels

Three channel prefixes:

| Prefix | When to publish | Subscribed by |
|---|---|---|
| `project:<id>` | Task created, updated, moved, deleted | Kanban board page |
| `task:<id>` | Comment added/updated/deleted, attachment added/deleted | Task detail layout |
| `user:<id>` | Notification added | App shell layout (drives the bell badge) |

The access check in the route ([`canAccessChannel`](../app/api/realtime/route.ts)) verifies:
- `user:X` → only X can subscribe
- `project:X` → must be a member of the project's org
- `task:X` → must be a member of the task's project's org

Channel format is validated by regex (`^(project|task|user):[a-z0-9]{20,40}$`) before any DB hit, so malformed inputs return 400 fast.

## Where publishes happen

Every action that mutates data publishes to the relevant channel. Search shows the matrix:

```bash
grep -nE "publish\(channels\." app/lib/actions/*.ts
```

Examples:

- `tasks.ts createTask` → `project.task.created`
- `tasks.ts moveTask` → `project.task.moved`
- `comments.ts createComment` → `task.comment.added` + `user.notification.added` per recipient
- `notifications.ts markNotificationRead` → `user.notification.added` (refreshes the bell badge)

## Why `router.refresh()` instead of granular state updates?

Pros:
- One handler covers every event type
- Server-side filters/sorts apply correctly (a moved task ends up in the right column)
- Doesn't bypass any of our cache or auth logic
- Works with optimistic UI — the kanban's `useOptimistic` rebases on the refreshed data

Cons:
- Refresh fetches everything, not just the changed bit (bandwidth)
- Slight latency vs. patching local state directly

For our scale this is fine. Linear-style "patch one card" optimization can come later if it matters.

## Production scaling

The in-memory broker is single-process. If you scale to multiple Node instances (Vercel, container fleet), publishes on instance A won't reach subscribers on instance B.

The fix is a **one-file swap to Redis pub/sub**. The shape of `subscribe`/`publish` is generic enough that the consumer code never changes — only `lib/realtime.ts` does:

```ts
// Replacement sketch — Redis pub/sub
import Redis from "ioredis";

const sub = new Redis(process.env.REDIS_URL);
const pub = new Redis(process.env.REDIS_URL);

export async function subscribe(channel: string, listener: Listener) {
  await sub.subscribe(channel);
  const handler = (ch: string, msg: string) => {
    if (ch === channel) listener(JSON.parse(msg));
  };
  sub.on("message", handler);
  return () => {
    sub.off("message", handler);
    sub.unsubscribe(channel);
  };
}

export async function publish(channel: string, type: string, payload?: unknown) {
  await pub.publish(channel, JSON.stringify({ channel, type, payload, at: Date.now() }));
}
```

Everything else — actions, channels, the SSE route, the client subscriber — stays the same.

## Smoke testing

The smoke pattern used during development:

```bash
# Open SSE in background, capture stream output
curl -s --no-buffer --max-time 6 \
  -H "Cookie: session=$TOKEN" \
  "http://localhost:3000/api/realtime?channel=project:$PROJ" > /tmp/sse.txt &

sleep 1
# Trigger an action (or hit a temp publish endpoint)
# ...
wait

cat /tmp/sse.txt
# event: ready
# data: {"channel":"project:..."}
# event: task.moved
# data: {"channel":"project:...","type":"task.moved","payload":{...}}
```
