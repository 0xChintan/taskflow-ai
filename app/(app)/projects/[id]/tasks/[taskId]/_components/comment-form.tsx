"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createComment } from "@/app/lib/actions/comments";

export function CommentForm({ taskId }: { taskId: string }) {
  const action = createComment.bind(null, taskId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      textareaRef.current?.focus();
      setPickedFiles([]);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-xs"
    >
      <textarea
        ref={textareaRef}
        name="body"
        required
        rows={3}
        placeholder="Write a comment…  use @name to mention someone"
        className="w-full rounded-md border-0 bg-transparent px-1 py-1 text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
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
        <ul className="text-xs text-destructive list-disc list-inside space-y-0.5">
          {state.errors.form.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        name="files"
        multiple
        className="hidden"
        onChange={(e) => setPickedFiles(e.target.files ? Array.from(e.target.files) : [])}
      />

      {pickedFiles.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-1">
          {pickedFiles.map((f, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-1 text-xs"
            >
              <span>📎</span>
              <span className="max-w-[160px] truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-subtle transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Attach
          </button>
          <span className="text-xs text-muted-foreground">⌘ + Enter to send</span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
    </form>
  );
}
