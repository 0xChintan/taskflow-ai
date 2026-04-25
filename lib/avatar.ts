/**
 * Deterministic auto-generated avatar URL using DiceBear's hosted API.
 * Same userId -> same illustration. No API key required.
 *
 * Style is `notionists` (friendly illustrated portraits). Other good options:
 * `lorelei`, `personas`, `avataaars`, `bottts`, `fun-emoji`, `identicon`.
 *
 * For production with high traffic, consider self-hosting via the @dicebear/core
 * npm package or proxying through a CDN.
 */

const STYLE = "notionists";

export function defaultAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(userId)}&backgroundColor=f1f5f9,e2e8f0,fef3c7,ddd6fe,fce7f3,d1fae5`;
}

export function avatarUrlFor(user: { id: string; avatarUrl?: string | null }): string {
  return user.avatarUrl || defaultAvatarUrl(user.id);
}
