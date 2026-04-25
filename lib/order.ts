export function getOrderBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return 1000;
  if (before == null) return after! / 2;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}
