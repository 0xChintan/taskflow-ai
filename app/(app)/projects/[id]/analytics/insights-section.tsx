"use client";

import { useState, useTransition } from "react";
import {
  generateProjectInsights,
  type ProjectInsightsResult,
} from "@/app/lib/actions/ai";

export function InsightsSection({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ProjectInsightsResult | null>(null);

  function generate() {
    setResult(null);
    startTransition(async () => {
      const r = await generateProjectInsights(projectId);
      setResult(r);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">AI insights</h2>
        <button
          type="button"
          disabled={pending}
          onClick={generate}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Analyzing…" : result ? "Re-analyze" : "Generate insights"}
        </button>
      </div>

      {!result && !pending && (
        <p className="text-sm text-muted-foreground">
          Get an AI-generated read on bottlenecks, risks, and suggested next steps based on this project&apos;s metrics.
        </p>
      )}

      {result && !result.ok && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {result && result.ok && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold tabular-nums">
              {result.data.healthScore}
            </div>
            <div className="text-sm text-muted-foreground">Health score / 100</div>
          </div>

          <Group title="Bottlenecks" items={result.data.bottlenecks} emptyText="None identified." />
          <Group title="Risks" items={result.data.risks} emptyText="None flagged." />
          <Group title="Suggestions" items={result.data.suggestions} />
        </div>
      )}
    </section>
  );
}

function Group({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText ?? "—"}</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-sm list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
