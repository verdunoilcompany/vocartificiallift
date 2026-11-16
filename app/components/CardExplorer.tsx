"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { sortByTime, type TimeSort } from "@/lib/dynocard/card-time";
import { FULL_PUMP } from "@/lib/dynocard/labels";
import type { DynoCard, ModelReference } from "@/types/dynocard";
import { CardViewer } from "./CardViewer";

const PAGE_SIZES = [25, 50, 100] as const;

interface CardExplorerProps {
  cards: DynoCard[];
  model: ModelReference;
}

/**
 * Every card on the page as a full-size viewer (details, "Compare with", model-importance
 * overlay), 25/50/100 per page. A sticky bar keeps the page size and paging in reach.
 */
export function CardExplorer({ cards, model }: CardExplorerProps) {
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(0);
  // Per-card viewer settings, so each card keeps its own choices.
  const [compareById, setCompareById] = useState<Record<string, string>>({});
  const [hideImportance, setHideImportance] = useState<Record<string, boolean>>(
    {},
  );

  // Cards the user closed; they drop out of the list (later cards move up) until restored.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  // Order by the card's date-and-time stamp (or keep file order), then drop closed cards.
  const [timeSort, setTimeSort] = useState<TimeSort>("file");
  const shown = sortByTime(
    cards.filter((c) => !hidden.has(c.id)),
    timeSort,
    (c) => c.date,
  );
  const hiddenCount = cards.length - shown.length;
  const hide = (id: string) => setHidden((h) => new Set(h).add(id));

  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pages - 1);
  const pageCards = shown.slice(current * pageSize, (current + 1) * pageSize);
  const first = shown.length ? current * pageSize + 1 : 0;
  const last = Math.min(shown.length, (current + 1) * pageSize);

  const compareFor = (c: DynoCard) =>
    compareById[c.id] ?? (model.ref[c.label] ? c.label : FULL_PUMP);

  const goTo = (p: number) => {
    setPage(p);
    document
      .getElementById("explorer-cards")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pager = (
    <div className="flex items-center gap-1 text-sm">
      <span
        className="mr-1 text-muted-foreground tabular"
        data-testid="page-status"
      >
        {first}–{last} of {shown.length}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => goTo(current - 1)}
        disabled={current === 0}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      <span className="px-1 text-muted-foreground tabular">
        {current + 1} / {pages}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => goTo(current + 1)}
        disabled={current >= pages - 1}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>
    </div>
  );

  return (
    <section aria-label="Card explorer" className="grid gap-5">
      {/* Sticky under the app header so the page size and paging stay reachable while scrolling. */}
      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-card/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="page-size" className="text-sm">
            Cards per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger
              id="page-size"
              className="h-8 w-20"
              data-testid="page-size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label
            htmlFor="time-sort"
            className="ml-2 flex items-center gap-1 text-sm"
          >
            <ArrowDownUp className="h-4 w-4" aria-hidden /> Sort by date &amp;
            time
          </Label>
          <Select
            value={timeSort}
            onValueChange={(v) => {
              setTimeSort(v as TimeSort);
              setPage(0);
            }}
          >
            <SelectTrigger
              id="time-sort"
              className="h-8 w-40"
              data-testid="time-sort"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="file">File order</SelectItem>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          {hiddenCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHidden(new Set())}
              data-testid="show-hidden"
            >
              <Eye /> Show {hiddenCount} hidden card
              {hiddenCount === 1 ? "" : "s"}
            </Button>
          )}
        </div>
        {pager}
      </div>

      {pageCards.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hiddenCount > 0 && cards.length === hiddenCount
            ? "All cards here are closed. Use “Show hidden cards” to bring them back."
            : "No cards match these filters."}
        </p>
      ) : (
        <div
          id="explorer-cards"
          className="grid scroll-mt-32 gap-5 2xl:grid-cols-2"
        >
          {pageCards.map((c) => (
            <LazyMount key={c.id}>
              <CardViewer
                card={c}
                model={model}
                compareLabel={compareFor(c)}
                onCompareChange={(label) =>
                  setCompareById((m) => ({ ...m, [c.id]: label }))
                }
                showImportance={!hideImportance[c.id]}
                onClose={() => hide(c.id)}
                onShowImportanceChange={(show) =>
                  setHideImportance((m) => ({ ...m, [c.id]: !show }))
                }
              />
            </LazyMount>
          ))}
        </div>
      )}

      {pages > 1 && <div className="flex justify-end">{pager}</div>}
    </section>
  );
}

/**
 * Renders children once they come near the viewport, so 100 cards per page don't draw
 * 100 Plotly charts at once. Stays mounted after that.
 */
function LazyMount({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      )}
    </div>
  );
}
