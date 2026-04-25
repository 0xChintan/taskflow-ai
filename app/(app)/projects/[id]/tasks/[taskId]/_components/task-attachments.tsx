"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadTaskAttachments } from "@/app/lib/actions/attachments";
import { AttachmentList, type AttachmentData } from "./attachment-list";

export function TaskAttachments({
  taskId,
  attachments,
  currentUserId,
}: {
  taskId: string;
  attachments: AttachmentData[];
  currentUserId: string;
}) {
  const action = uploadTaskAttachments.bind(null, taskId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </h2>
        <form ref={formRef} action={formAction}>
          <input
            ref={inputRef}
            type="file"
            name="files"
            multiple
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {pending ? "Uploading…" : "+ Upload"}
          </button>
        </form>
      </div>

      {state?.errors?.files && (
        <ul className="text-xs text-destructive list-disc list-inside">
          {state.errors.files.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {state?.errors?.form && (
        <p className="text-xs text-destructive">{state.errors.form[0]}</p>
      )}

      <AttachmentList
        attachments={attachments}
        currentUserId={currentUserId}
        layout="grid"
      />

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No files yet. Drop images, PDFs, or zips up to 10 MB.
        </p>
      )}
    </section>
  );
}
