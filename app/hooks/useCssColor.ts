"use client";

/**
 * Resolves an HSL-channel CSS variable (e.g. `--stroke-up: 196 64% 32%`) to a color string
 * Plotly understands. Read at render time so it follows the active light/dark theme.
 */
export function cssColor(variable: string, alpha = 1): string {
  if (typeof window === "undefined") return "#888";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return "#888";
  const [h, s, l] = parts;
  return alpha >= 1 ? `hsl(${h}, ${s}, ${l})` : `hsla(${h}, ${s}, ${l}, ${alpha})`;
}
