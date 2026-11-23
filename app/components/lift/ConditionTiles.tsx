"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CardRangeFields } from "@/app/components/CardRangeFields";
import type { MldbLabels } from "@/app/hooks/useMldbLabels";
import {
  CONDITION_LABELS,
  summarizePredictions,
  type ConditionSummary,
} from "@/lib/dynocard/conditions";
import { usDay, type CardRange } from "@/lib/dynocard/card-range";
import { drillHref } from "@/lib/dynocard/drill";
import { cn } from "@/lib/utils";
import { WARNING_CONDITIONS, type PumpCondition } from "@/types/lift";

function conditionColor(c: PumpCondition, n: number) {
  if (n === 0) return "text-good";
  return WARNING_CONDITIONS.includes(c) ? "text-warn" : "text-destructive";
}

const sourceLabels = (c: PumpCondition) =>
  c === "Bad Data"
    ? "any label other than Full Pump"
    : CONDITION_LABELS[c].join(", ");

/**
 * The 13 pump-condition tiles, counted from the MLDB dynocard predictions for the shared date
 * range (the same cards the Dynocard Classifier and Explorer show). Optionally narrowed to one
 * well. Click a tile to see which wells are behind the number.
 */
export function ConditionTiles({
  mldb,
  well,
}: {
  mldb: MldbLabels;
  /** The well selected on the dashboard, if any. */
  well?: string | null;
}) {
  const cards = useMemo(
    () =>
      mldb.cards && well
        ? mldb.cards.filter((c) => c.node === well)
        : (mldb.cards ?? []),
    [mldb.cards, well],
  );
  const summary = useMemo(() => summarizePredictions(cards), [cards]);
  const unavailable = !mldb.loading && !mldb.cards;

  return (
    <div className="grid content-start gap-2">
      <DataSourceBar
        mldb={mldb}
        testId="tiles-source"
        idPrefix="tiles-range"
        className="w-full justify-self-end sm:w-80"
      />
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7"
        aria-label="Pump conditions"
      >
        {summary.map((s) => (
          <li key={s.condition}>
            <ConditionTile
              summary={s}
              range={mldb.range}
              loading={mldb.loading}
              unavailable={unavailable}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConditionTile({
  summary: s,
  range,
  loading,
  unavailable,
}: {
  summary: ConditionSummary;
  /** Dashboard date range, carried into the Classifier / Explorer links. */
  range: CardRange;
  loading: boolean;
  /** MLDB couldn't be read (or the dates are invalid): show a dash instead of a count. */
  unavailable: boolean;
}) {
  const n = s.wells.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading || unavailable}
        data-testid="condition-tile"
        data-condition={s.condition}
        className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border bg-card p-3 text-center transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary"
      >
        <span className="font-display text-base font-semibold leading-tight">
          {s.condition}
        </span>
        {loading ? (
          <Skeleton className="h-6 w-10" />
        ) : unavailable ? (
          <span className="font-display text-2xl font-semibold text-muted-foreground">
            –
          </span>
        ) : (
          <>
            <span
              className={cn(
                "font-display text-2xl font-semibold tabular",
                conditionColor(s.condition, n),
              )}
            >
              {n}
            </span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              {n === 0 ? "All Good!" : `${s.pct}% of all cards`}
              <ChevronDown className="h-3 w-3" aria-hidden />
            </span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 w-96 overflow-y-auto"
        data-testid="condition-wells"
      >
        {(() => {
          const summary = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span>
                  {s.condition} · {n} well{n === 1 ? "" : "s"} · {s.cardCount}{" "}
                  card{s.cardCount === 1 ? "" : "s"}
                </span>
                {n > 0 && (
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Model label: {sourceLabels(s.condition)} ·{" "}
                {range.from === range.to
                  ? usDay(range.from)
                  : `${usDay(range.from)} – ${usDay(range.to)}`}
              </span>
            </>
          );
          // The header opens all of this condition's cards (date range) in the Classifier.
          return n > 0 ? (
            <DropdownMenuItem asChild>
              <Link
                href={drillHref("classifier", {
                  condition: s.condition,
                  range,
                })}
                className="grid cursor-pointer gap-0.5 font-semibold"
                title={`Open all ${s.condition} cards in the Dynocard Classifier`}
                data-testid="condition-view-all"
              >
                {summary}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuLabel className="grid gap-0.5">
              {summary}
            </DropdownMenuLabel>
          );
        })()}
        <DropdownMenuSeparator />
        {n === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            No wells. All Good!
          </p>
        ) : (
          // Each well opens its cards for this condition and date range in the Classifier.
          s.wells.map((w) => (
            <DropdownMenuItem key={w.well} asChild>
              <Link
                href={drillHref("classifier", {
                  condition: s.condition,
                  well: w.well,
                  range,
                })}
                className="grid min-w-0 cursor-pointer gap-0.5"
                title={`Open ${w.well}'s ${s.condition} cards in the Dynocard Classifier`}
                data-testid="condition-well-link"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{w.well}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">
                    {w.cards} card{w.cards === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {w.labels.length > 0 && `${w.labels.join(", ")} · `}
                  {w.lastDate ? `last ${w.lastDate}` : "no date"}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The dashboard's dynocard date range (From / To), shared with the Dynocard Classifier and
 * Explorer: changing it here changes them too. Shows a short message only when MLDB can't be
 * read. Used above the condition tiles and in the Pump Conditions by Well header.
 */
export function DataSourceBar({
  mldb,
  testId,
  idPrefix,
  className,
}: {
  mldb: MldbLabels;
  testId?: string;
  idPrefix: string;
  className?: string;
}) {
  const problem = mldb.rangeProblem ?? mldb.error;
  return (
    <div className={cn("grid gap-1.5", className)} data-testid={testId}>
      <CardRangeFields
        range={mldb.range}
        onChange={mldb.setRange}
        maxDays={mldb.maxDays}
        idPrefix={idPrefix}
      />
      {problem && (
        <p
          className="flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">{problem}</span>
          {mldb.error && !mldb.rangeProblem && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-2 text-xs"
              onClick={mldb.retry}
            >
              <RotateCcw className="h-3 w-3" /> Try again
            </Button>
          )}
        </p>
      )}
    </div>
  );
}
