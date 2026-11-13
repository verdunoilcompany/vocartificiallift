import type { Well } from "@/types/lift";

/**
 * Builds the /api/lift/trend path. Selected wells win; otherwise the filtered wells
 * (or all wells, sent as an empty list, when no filter is active).
 */
export function trendQuery(
  start: string,
  end: string,
  filtered: Well[],
  filtersActive: boolean,
  selected: Set<string>,
): string {
  const names =
    selected.size > 0
      ? [...selected]
      : filtersActive
        ? filtered.map((w) => w.name)
        : [];
  const p = new URLSearchParams({ start, end, wells: names.join("|") });
  return `/api/lift/trend?${p.toString()}`;
}
