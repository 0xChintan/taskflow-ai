// Pure utility — no server-only since it's used in both server and client contexts.

export function getContrastForeground(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Relative luminance per WCAG
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
}

export const ORG_COLOR_PRESETS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#2563eb" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Teal", value: "#0d9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Lime", value: "#65a30d" },
  { name: "Amber", value: "#d97706" },
  { name: "Orange", value: "#ea580c" },
  { name: "Red", value: "#dc2626" },
  { name: "Rose", value: "#e11d48" },
  { name: "Pink", value: "#db2777" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Slate", value: "#475569" },
  { name: "Stone", value: "#57534e" },
] as const;

export const DEFAULT_ORG_COLOR = "#6366f1";
