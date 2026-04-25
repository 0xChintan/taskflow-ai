import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
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

export type StorageError = { code: "too_large" | "bad_type" | "empty"; message: string };

export function validateFile(file: File): StorageError | null {
  if (file.size === 0) return { code: "empty", message: `${file.name} is empty.` };
  if (file.size > MAX_SIZE) {
    return { code: "too_large", message: `${file.name} is larger than 10 MB.` };
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return { code: "bad_type", message: `${file.name} (${file.type || "unknown"}) is not an allowed file type.` };
  }
  return null;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
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
  const dir = path.dirname(fullPath);
  await rm(fullPath, { force: true });
  await rm(dir, { recursive: true, force: true });
}

export function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
