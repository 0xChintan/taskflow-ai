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
        <ul className="text-xs text-destructive list-disc list-inside">
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
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {pickedFiles.map((f, i) => (
            <li key={i}>📎 {f.name}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Attach
          </button>
          <span className="text-xs text-muted-foreground">⌘ + Enter to send</span>
        </div>
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
