"use client";

import { useState, useTransition } from "react";
import { generateTaskDescription } from "@/app/lib/actions/ai";

export function GenerateDescriptionButton({
  taskId,
  textareaName = "description",
}: {
  taskId: string;
  textareaName?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const r = await generateTaskDescription(taskId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const textarea = document.querySelector<HTMLTextAreaElement>(
        `textarea[name="${textareaName}"]`,
      );
      if (textarea) {
        const criteria = r.data.acceptanceCriteria
          .map((c) => `- ${c}`)
          .join("\n");
        textarea.value = `${r.data.description}\n\n**Acceptance criteria**\n${criteria}`;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={generate}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {pending ? "Generating…" : "✨ Generate with AI"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
