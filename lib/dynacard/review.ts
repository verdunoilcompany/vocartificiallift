import type { DynaCard } from "@/types/dynacard";
import { FULLISH_LABELS, FULL_PUMP } from "./labels";

/**
 * Heuristic cross-checks between the predicted label and the card's other evidence.
 * Returns a reviewer note, or "" when nothing looks inconsistent.
 */
export function autoReviewNote(card: Pick<DynaCard, "fill" | "label" | "L">): string {
  const notes: string[] = [];
  const { fill, label, L } = card;

  if (fill != null && fill >= 95 && !FULLISH_LABELS.includes(label)) {
    notes.push(`Fillage is ${fill}%, which usually means a full pump, but the label is ${label}.`);
  }
  if (fill != null && fill < 88 && label === FULL_PUMP) {
    notes.push(
      `Fillage is ${fill}%, which is low for a full pump. Could be fluid pound or gas interference.`,
    );
  }
  if (label === "Tubing Movement" && L.length >= 28 && L[24] - L[27] > 0.5) {
    notes.push(
      "Only the left side is tilted; the load drops off sharply right after the top. Could be Full Pump or Fluid Pound.",
    );
  }
  return notes.join(" ");
}

export function withReviewNotes<T extends Pick<DynaCard, "fill" | "label" | "L">>(
  cards: T[],
): (T & { note: string })[] {
  return cards.map((c) => ({ ...c, note: autoReviewNote(c) }));
}
