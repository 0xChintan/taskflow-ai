"use client";

import { useActionState, useEffect, useRef } from "react";
import { createComment } from "@/app/lib/actions/comments";

export function CommentForm({ taskId }: { taskId: string }) {
  const action = createComment.bind(null, taskId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <textarea
        ref={textareaRef}
        name="body"
        required
        rows={3}
        placeholder="Write a comment… use @name to mention someone"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {state?.errors?.body && (
        <p className="text-xs text-destructive">{state.errors.body[0]}</p>
      )}
      {state?.errors?.form && (
        <p className="text-xs text-destructive">{state.errors.form[0]}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">⌘ + Enter to send</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
