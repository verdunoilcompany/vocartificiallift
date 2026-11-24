import type { CardRange } from "@/lib/dynocard/card-range";

/**
 * Links from the Daily Dashboard into the Dynocard Classifier (`/dynocard-classifier`) or Explorer (`/dynocard-explorer`),
 * filtered to a pump condition (or a model label such as Full Pump), optionally one well, and
 * the dashboard's date range, so the page opens on exactly the cards behind the number.
 * `DynocardReview` reads these: ?condition= | ?label=, &well=, &from=&to=.
 */
export type DrillPage = "classifier" | "explorer";

export function drillHref(
  page: DrillPage,
  f: { condition?: string; label?: string; well?: string; range: CardRange },
): string {
  const q = new URLSearchParams();
  if (f.condition) q.set("condition", f.condition);
  if (f.label) q.set("label", f.label);
  if (f.well) q.set("well", f.well);
  q.set("from", f.range.from);
  q.set("to", f.range.to);
  return `${page === "explorer" ? "/dynocard-explorer" : "/dynocard-classifier"}?${q.toString()}`;
}
