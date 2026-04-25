import "server-only";

export type RealtimeEvent = {
  channel: string;
  type: string;
  payload?: unknown;
  at: number;
};

type Listener = (event: RealtimeEvent) => void;

type Broker = {
  channels: Map<string, Set<Listener>>;
};

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
  return () => {
    const s = broker.channels.get(channel);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) broker.channels.delete(channel);
  };
}

export function publish(channel: string, type: string, payload?: unknown) {
  const broker = getBroker();
  const set = broker.channels.get(channel);
  if (!set || set.size === 0) return;
  const event: RealtimeEvent = { channel, type, payload, at: Date.now() };
  for (const listener of set) {
    try {
      listener(event);
    } catch {
      // a misbehaving listener shouldn't break the broker
    }
  }
}

export const channels = {
  project: (projectId: string) => `project:${projectId}`,
  task: (taskId: string) => `task:${taskId}`,
  user: (userId: string) => `user:${userId}`,
};
