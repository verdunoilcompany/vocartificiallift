import type { AspmState } from "@/types/lift";

/** CSS variable (HSL channels) for each ASPM classification; see app/globals.css. */
export const ASPM_VAR: Record<AspmState, string> = {
  "Dialed In": "--aspm-dialed",
  Overpumping: "--aspm-over",
  Underpumping: "--aspm-under",
  "Gas Interference": "--aspm-gas",
  Undefined: "--aspm-undefined",
  Unclassified: "--aspm-unclassified",
};

export const aspmBg = (s: AspmState | null) =>
  s ? `hsl(var(${ASPM_VAR[s]}))` : "transparent";
