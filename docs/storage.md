# File storage

Attachments use a thin storage abstraction with a local-disk driver in dev. The `Attachment` model stores everything needed to swap to a cloud provider (S3, Cloudinary, R2) by replacing one file.

## Schema

```prisma
model Attachment {
  id         String   @id @default(cuid())
  filename   String           // original user-provided name
  url        String           // public URL — stored to avoid recomputing per render
  publicId   String           // provider-side identifier — needed for delete
  mimeType   String
  size       Int              // bytes

  // Polymorphic — exactly one of these is non-null
  taskId     String?
  commentId  String?
  uploaderId String

  createdAt  DateTime @default(now())
}
```

The `publicId` field is the key to the swap design — it's whatever the storage provider needs to delete the file later. For local storage it's the relative path under `public/`. For Cloudinary it would be the Cloudinary public_id.

## The driver — [lib/storage.ts](../lib/storage.ts)

The local driver writes to `public/uploads/<random16hex>/<safe-filename>` and returns a URL Next.js will serve directly:

```ts
const MAX_SIZE = 10 * 1024 * 1024;        // 10 MB
const ALLOWED_MIMES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/markdown", "text/csv",
  "application/json",
  "application/zip",
]);

export type SavedFile = {
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export function validateFile(file: File): StorageError | null {
  if (file.size === 0) return { code: "empty", message: `${file.name} is empty.` };
  if (file.size > MAX_SIZE) return { code: "too_large", message: `${file.name} is larger than 10 MB.` };
  if (!ALLOWED_MIMES.has(file.type)) return { code: "bad_type", message: `${file.name} is not allowed.` };
  return null;
}

export async function saveFile(file: File): Promise<SavedFile> {
  const err = validateFile(file);
  if (err) throw new Error(err.message);

  const id = randomBytes(8).toString("hex");
  const filename = safeName(file.name);
  const relPath = `uploads/${id}/${filename}`;
  const fullPath = path.join(process.cwd(), "public", relPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return {
    url: `/${relPath}`,
    publicId: relPath,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteFileByPublicId(publicId: string) {
  if (!publicId.startsWith("uploads/")) return;
  const fullPath = path.join(process.cwd(), "public", publicId);
  await rm(fullPath, { force: true });
  await rm(path.dirname(fullPath), { recursive: true, force: true });
}
```

Why per-file random subdirs? Two reasons:
1. Avoids filename collisions without mangling user-visible names.
2. Cleaning up on delete just removes the dir — no "oops we deleted someone else's file" risk.

## Server Action body size limit

By default, Next.js Server Actions reject request bodies > 1 MB. We bumped this to 11 MB in [next.config.ts](../next.config.ts):

```ts
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
};
```

This is server-side — even though `validateFile()` rejects files over 10 MB, Next would have killed the request before our action even ran without this config.

## Upload flow

Two entry points — task-level and comment-level — share the same driver.

### Task attachment ([uploadTaskAttachments](../app/lib/actions/attachments.ts))

```ts
export async function uploadTaskAttachments(taskId, _prev, formData) {
  const { userId } = await verifySession();
  const task = await prisma.task.findUnique({...});
  await requireProjectAccess(task.projectId);

  const files = formData.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) return { errors: { files: ["Choose at least one file."] } };

  // Validate all before saving any
  const errors = files.map(validateFile).filter(Boolean);
  if (errors.length) return { errors: { files: errors.map((e) => e!.message) } };

  for (const f of files) {
    const saved = await saveFile(f);
    await prisma.attachment.create({ data: { taskId, uploaderId: userId, ...saved } });
  }

  publish(channels.task(taskId), "attachment.added", { taskId });
  revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
  return { ok: true };
}
```

### Comment attachment

Files are picked in the comment composer and travel along with the comment body in the same `FormData`. The `createComment` action saves them after persisting the comment:

```ts
const comment = await prisma.comment.create({ data: { body, taskId, userId } });

for (const f of files) {
  const saved = await saveFile(f);
  await prisma.attachment.create({
    data: { commentId: comment.id, uploaderId: userId, ...saved },
  });
}
```

## Authorization for delete

Anyone can delete an attachment they uploaded. Org `OWNER`/`ADMIN` can delete anyone's:

```ts
let allowed = att.uploaderId === userId;
if (!allowed) {
  const member = await prisma.orgMember.findUnique({...});
  allowed = member?.role === Role.OWNER || member?.role === Role.ADMIN;
}
if (!allowed) throw new Error("Forbidden");
```

## Swapping to Cloudinary

The `Attachment` model already has the `publicId` field that Cloudinary needs. To swap:

1. `npm install cloudinary`
2. Add `CLOUDINARY_URL` to env
3. Replace [lib/storage.ts](../lib/storage.ts) with a Cloudinary implementation that returns the same `SavedFile` shape:

```ts
// Replacement sketch
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

export async function saveFile(file: File): Promise<SavedFile> {
  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder: "taskflow" },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
    stream.end(buffer);
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function deleteFileByPublicId(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}
```

Nothing in the action layer or UI changes.

## Known limitations

- **No file blob cleanup on cascade.** When you delete a task or comment, the FK cascade removes the `Attachment` row but the underlying file in `public/uploads/` stays. In dev this is harmless (gitignored). In production: add a periodic sweep job that deletes orphaned files.
- **No virus scan.** Fine for internal-team usage; for public-facing apps you'd want ClamAV or a hosted equivalent.
- **No image transcoding / thumbnails.** Images are rendered at their original resolution via `<img>`. For production you'd use `next/image` (needs known dimensions) or a CDN with on-the-fly transforms.
- **No drag-and-drop drop zone.** Files are picked via the file input. Adding HTML5 `dragover`/`drop` events would be ~30 lines.
- **No image preview before upload.** Files appear as filenames in the comment composer; thumbnails only render after submit.

## Static serving

Files in `public/` are served by Next.js as static files automatically. The URL `/uploads/abc123/photo.png` maps to `<project root>/public/uploads/abc123/photo.png`. No route handler needed — Next handles range requests, etag, content-type via file extension, etc.

For Cloudinary, URLs become `https://res.cloudinary.com/...` and Next isn't involved at all.
