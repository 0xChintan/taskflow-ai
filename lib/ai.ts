import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export class MissingAnthropicKeyError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI features.",
    );
    this.name = "MissingAnthropicKeyError";
  }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingAnthropicKeyError();
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

const MODEL = "claude-opus-4-7";

const DescriptionSchema = z.object({
  description: z
    .string()
    .describe("A 2–3 sentence task description in plain prose."),
  acceptanceCriteria: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("Concrete, testable acceptance criteria."),
});

export type GeneratedDescription = z.infer<typeof DescriptionSchema>;

export async function generateDescription(
  title: string,
): Promise<GeneratedDescription> {
  const client = getClient();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 800,
    output_config: {
      effort: "low",
      format: zodOutputFormat(DescriptionSchema),
    },
    system:
      "You are a senior product manager writing concise task descriptions for an engineering team. Be specific and pragmatic.",
    messages: [
      {
        role: "user",
        content: `Task title: "${title}"\n\nWrite a short description and 2–6 acceptance criteria. Skip preamble — return only the structured object.`,
      },
    ],
  });
  if (!response.parsed_output) {
    throw new Error("AI did not return a parseable description.");
  }
  return response.parsed_output;
}

const InsightsSchema = z.object({
  bottlenecks: z
    .array(z.string())
    .max(5)
    .describe("Specific blockers or chokepoints visible in the data."),
  risks: z
    .array(z.string())
    .max(5)
    .describe("Risks to delivery — staffing, scope, dependencies, or quality."),
  suggestions: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Actionable next steps the team should take this week."),
  healthScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall project health from 0 (critical) to 100 (excellent)."),
});

export type ProjectInsights = z.infer<typeof InsightsSchema>;

export type InsightsInput = {
  projectName: string;
  projectKey: string;
  totals: {
    tasks: number;
    done: number;
    inProgress: number;
    inReview: number;
    backlog: number;
    todo: number;
    cancelled: number;
    overdue: number;
    unassigned: number;
  };
  avgCycleDays: number | null;
  activeSprint: {
    name: string;
    startDate: string;
    endDate: string;
    tasksInSprint: number;
    tasksDoneInSprint: number;
  } | null;
  recentVelocity: { sprint: string; pointsCompleted: number }[];
};

export async function getProjectInsights(
  input: InsightsInput,
): Promise<ProjectInsights> {
  const client = getClient();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(InsightsSchema),
    },
    system:
      "You are an experienced agile delivery lead. Analyze project metrics and surface specific, actionable insights — not generic advice. Reference numbers from the data when possible.",
    messages: [
      {
        role: "user",
        content: `Project: ${input.projectName} (${input.projectKey})\n\nMetrics:\n${JSON.stringify(input, null, 2)}\n\nReturn a structured insights object. Be concrete; cite numbers from the metrics where they support a point.`,
      },
    ],
  });
  if (!response.parsed_output) {
    throw new Error("AI did not return parseable insights.");
  }
  return response.parsed_output;
}
