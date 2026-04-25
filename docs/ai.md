# AI features

TaskFlow uses **Claude Opus 4.7** via the official [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk) for two product features:

1. **Generate task description** — given a task title, generate a 2-3 sentence description plus 2-6 acceptance criteria.
2. **Project insights** — given the project's metrics (status counts, overdue, unassigned, sprint progress, velocity), generate bottlenecks, risks, suggestions, and a 0-100 health score.

Everything lives in two files:

- [lib/ai.ts](../lib/ai.ts) — Anthropic SDK wrapper, Zod schemas, helper functions
- [app/lib/actions/ai.ts](../app/lib/actions/ai.ts) — Server actions that gather context and call the helpers

## Why Claude Opus 4.7

The default per the [official Claude API guidance](https://docs.anthropic.com/) is the latest stable model. At time of writing that's `claude-opus-4-7`. Don't downgrade for cost without explicit reason — that's the user's decision.

For lighter calls (description generation), we use:
- `output_config.effort: "low"`
- No `thinking` field (defaults to disabled on Opus 4.7)

For analytical calls (project insights), we use:
- `thinking: { type: "adaptive" }`
- `output_config.effort: "medium"`

## Structured outputs with Zod

The SDK has a `messages.parse()` method that takes a Zod schema and returns parsed, typed data — guaranteed to match the schema or it throws. Much cleaner than asking Claude to "return JSON" and parsing manually.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const DescriptionSchema = z.object({
  description: z.string().describe("A 2–3 sentence task description."),
  acceptanceCriteria: z.array(z.string()).min(2).max(6),
});

export async function generateDescription(title: string) {
  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 800,
    output_config: {
      effort: "low",
      format: zodOutputFormat(DescriptionSchema),
    },
    system: "You are a senior product manager writing concise task descriptions.",
    messages: [{
      role: "user",
      content: `Task title: "${title}"\n\nWrite a short description and 2–6 acceptance criteria.`,
    }],
  });
  return response.parsed_output!;   // typed as z.infer<typeof DescriptionSchema>
}
```

The `.describe()` calls on Zod fields become part of the schema sent to Claude, so the model knows what each field is for.

## What's NOT used (and why)

- **Sampling parameters** (`temperature`, `top_p`, `top_k`): removed on Opus 4.7. We don't pass them.
- **Prompt caching**: prompts are well under Opus 4.7's 4096-token cache minimum, so caching wouldn't activate. Omitted.
- **Streaming**: both prompts return short outputs; non-streaming is fine and simpler.

## Action layer — [app/lib/actions/ai.ts](../app/lib/actions/ai.ts)

### Description generation

Trivial — just take the task ID, look up its title, call the helper:

```ts
export async function generateTaskDescription(taskId: string): Promise<GenerateDescriptionResult> {
  const task = await prisma.task.findUnique({...});
  await requireProjectAccess(task.projectId);
  try {
    const data = await generateDescription(task.title);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof MissingAnthropicKeyError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "AI request failed. Try again." };
  }
}
```

The client-side button receives the result and pastes the markdown into the description textarea (see [generate-description-button.tsx](../app/%28app%29/projects/%5Bid%5D/tasks/%5BtaskId%5D/_components/generate-description-button.tsx)).

### Project insights

More involved — gathers metrics in a parallel `Promise.all` before calling the helper:

```ts
const [statusCounts, overdue, unassigned, activeSprint, sprints, doneTasks] = await Promise.all([
  prisma.task.groupBy({...}),
  prisma.task.count({ where: { dueDate: { lt: now }, status: { not: DONE } } }),
  prisma.task.count({ where: { assigneeId: null, status: { not: DONE } } }),
  prisma.sprint.findFirst({ where: { isActive: true }, select: {...} }),
  prisma.sprint.findMany({ where: { isActive: false }, take: 5 }),
  prisma.task.findMany({ where: { status: DONE }, take: 100 }),
]);

// Compute avgCycleDays from doneTasks
const avgCycleDays = ...;

const data = await getProjectInsights({
  projectName, projectKey, totals: {...}, avgCycleDays,
  activeSprint: {...}, recentVelocity: [...],
});
```

The helper sends this as a JSON-serialized blob in the user message, and Claude returns structured insights:

```ts
const InsightsSchema = z.object({
  bottlenecks: z.array(z.string()).max(5),
  risks: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).min(1).max(5),
  healthScore: z.number().min(0).max(100),
});
```

## Graceful degradation when no API key

If `ANTHROPIC_API_KEY` isn't set, we throw a typed error instead of crashing:

```ts
export class MissingAnthropicKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI features.");
    this.name = "MissingAnthropicKeyError";
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingAnthropicKeyError();
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}
```

The action catches it specifically and returns `{ ok: false, error: e.message }`, which the UI renders inline:

```tsx
{result && !result.ok && (
  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
    {result.error}
  </div>
)}
```

So users without a key get a clear "set ANTHROPIC_API_KEY in .env.local" message rather than a generic 500.

## UI integration

| Feature | Trigger | File |
|---|---|---|
| Generate description | "✨ Generate with AI" button next to the description label on task Edit tab | [generate-description-button.tsx](../app/%28app%29/projects/%5Bid%5D/tasks/%5BtaskId%5D/_components/generate-description-button.tsx) |
| Project insights | "Generate insights" button at the bottom of the Analytics page | [insights-section.tsx](../app/%28app%29/projects/%5Bid%5D/analytics/insights-section.tsx) |

Both use `useTransition` to show a pending state while the API call runs.

## Cost considerations

- **Description**: ~50 input tokens + ~200 output tokens per call. Negligible at any reasonable usage.
- **Insights**: ~200-500 input tokens (the metrics blob) + ~400 output tokens. Adaptive thinking adds variable cost. Still cheap.

For a project with high call volume, switch to Sonnet 4.6 — same SDK shape, cheaper:

```ts
const MODEL = "claude-sonnet-4-6";  // ← swap line
```

## Adding a new AI feature

The pattern is:

1. Define a Zod schema for the output in [lib/ai.ts](../lib/ai.ts).
2. Add a helper function that calls `client.messages.parse()`.
3. Wrap it in a server action in [app/lib/actions/ai.ts](../app/lib/actions/ai.ts) that:
   - Validates auth/access via the DAL
   - Gathers any context data via Prisma
   - Calls the helper
   - Returns `{ ok: true, data }` or `{ ok: false, error }`
4. Build a client component that calls the action via `useTransition`, shows pending state, renders the response.

## Deferred AI features

These were in the original spec but cut for scope:

- **Task breakdown** — given a task title + description, return suggested subtasks. Needs subtask UI which doesn't exist.
- **Prioritization** — given a list of tasks, rank them by importance with reasoning.
- **Daily recommendations** — given a user, return what they should work on today.

Each is ~50 lines of action code + a small UI surface; easy to add when the underlying features (subtasks, daily view) are in place.
