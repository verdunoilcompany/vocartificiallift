"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileUp, X } from "lucide-react";

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
import { useUploadedPredictions } from "@/app/contexts/UploadedPredictionsContext";
import {
  CONDITION_LABELS,
  sortWells,
  summarizePredictions,
  type ConditionSummary,
} from "@/lib/dynocard/conditions";
import { cn } from "@/lib/utils";
import {
  PUMP_CONDITIONS,
  WARNING_CONDITIONS,
  type DailyRow,
  type PumpCondition,
} from "@/types/lift";

/** Tiles from the dashboard's own (sample) daily rows: the default when nothing is uploaded. */
function summarizeDailyRows(rows: DailyRow[]): ConditionSummary[] {
  const totalCards = rows.reduce((s, r) => s + r.dailyCardCount, 0);
  return PUMP_CONDITIONS.map((condition) => {
    const hit = rows.filter((r) => (r.conditions[condition] ?? 0) > 0);
    const cardCount = hit.reduce(
      (s, r) => s + (r.conditions[condition] ?? 0),
      0,
    );
    return {
      condition,
      wells: sortWells(
        hit.map((r) => ({
          well: r.well,
          cards: r.conditions[condition] ?? 0,
          lastDate: r.date,
          labels: [],
        })),
      ),
      cardCount,
      pct: totalCards ? Math.round((cardCount / totalCards) * 100) : 0,
    };
  });
}

function conditionColor(c: PumpCondition, n: number) {
  if (n === 0) return "text-good";
  return WARNING_CONDITIONS.includes(c) ? "text-warn" : "text-destructive";
}

/** Dynocard Classifier showing this condition's cards (optionally one well's). */
const classifierHref = (condition: PumpCondition, well?: string) => {
  const q = new URLSearchParams({ condition });
  if (well) q.set("well", well);
  return `/?${q.toString()}`;
};

const sourceLabels = (c: PumpCondition) =>
  c === "Bad Data"
    ? "any label other than Full Pump"
    : CONDITION_LABELS[c].join(", ");

/**
 * The 13 pump-condition tiles. Uses the last uploaded predictions file when there is one
 * (see UploadedPredictionsContext), otherwise the 25 sample cards the Classifier shows;
 * the dashboard's daily rows are only a fallback if those can't be loaded.
 * Click a tile to see which wells are behind the number.
 */
export function ConditionTiles({
  rows,
  loading,
}: {
  rows: DailyRow[];
  loading: boolean;
}) {
  const { predictions, defaultPredictions, defaultError } =
    useUploadedPredictions();
  const source = predictions ?? defaultPredictions;
  const summary = useMemo(
    () =>
      source ? summarizePredictions(source.cards) : summarizeDailyRows(rows),
    [source, rows],
  );
  // Waiting for the default file (or, if it failed, for the dashboard rows).
  const busy = !source && (!defaultError || loading);
  return (
    <div className="grid content-start gap-2">
      <DataSourceBar
        hint="Click a tile to see its wells."
        testId="tiles-source"
      />
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7"
        aria-label="Pump conditions"
      >
        {summary.map((s) => (
          <li key={s.condition}>
            <ConditionTile
              summary={s}
              loading={busy}
              fromPredictions={Boolean(source)}
              linkable={Boolean(source)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConditionTile({
  summary: s,
  loading,
  fromPredictions,
  linkable,
}: {
  summary: ConditionSummary;
  loading: boolean;
  /** Counts come from model labels (upload or default file): show the label mapping. */
  fromPredictions: boolean;
  /** Links into the Classifier, which holds the same cards (upload or samples). */
  linkable: boolean;
}) {
  const n = s.wells.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        data-testid="condition-tile"
        data-condition={s.condition}
        className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border bg-card p-3 text-center transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary"
      >
        <span className="font-display text-base font-semibold leading-tight">
          {s.condition}
        </span>
        {loading ? (
          <Skeleton className="h-6 w-10" />
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
        className="max-h-80 w-80 overflow-y-auto"
        data-testid="condition-wells"
      >
        {linkable && n > 0 ? (
          // Uploaded data: the header opens all of this condition's cards in the Classifier.
          <DropdownMenuItem asChild>
            <Link
              href={classifierHref(s.condition)}
              className="grid cursor-pointer gap-0.5 font-semibold"
              data-testid="condition-view-all"
            >
              <span className="flex items-center justify-between gap-2">
                <span>
                  {s.condition} · {n} well{n === 1 ? "" : "s"} · {s.cardCount}{" "}
                  card{s.cardCount === 1 ? "" : "s"}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Model label: {sourceLabels(s.condition)} · open all in Dynocard
                Classifier
              </span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuLabel className="grid gap-0.5">
            <span>
              {s.condition} · {n} well{n === 1 ? "" : "s"} · {s.cardCount} card
              {s.cardCount === 1 ? "" : "s"}
            </span>
            {fromPredictions && (
              <span className="text-xs font-normal text-muted-foreground">
                Model label: {sourceLabels(s.condition)}
              </span>
            )}
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        {n === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">
            No wells. All Good!
          </p>
        ) : (
          s.wells.map((w) => {
            const body = (
              <>
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
              </>
            );
            // Uploaded data: each well opens its cards for this condition in the Classifier.
            return linkable ? (
              <DropdownMenuItem key={w.well} asChild>
                <Link
                  href={classifierHref(s.condition, w.well)}
                  className="grid cursor-pointer gap-0.5"
                  data-testid="condition-well-link"
                >
                  {body}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={w.well}
                className="grid gap-0.5"
                onSelect={(e) => e.preventDefault()}
              >
                {body}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Where the dashboard's dynocard numbers come from: the uploaded predictions file or the
 * 25 sample cards. Links to the Classifier/Explorer (to upload) and "Use default data".
 * Shared by the condition tiles and the Pump Conditions by Well table.
 */
export function DataSourceBar({
  hint,
  testId,
}: {
  hint: string;
  testId?: string;
}) {
  const { predictions, clear, defaultPredictions } = useUploadedPredictions();
  const source = predictions ?? defaultPredictions;
  const wellCount = source ? new Set(source.cards.map((c) => c.node)).size : 0;
  if (!source) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-1.5 text-xs",
        predictions ? "border-primary/30 bg-primary/5" : "bg-muted/40",
      )}
      data-testid={testId}
    >
      <FileUp
        className={cn(
          "mt-px h-3.5 w-3.5 shrink-0",
          predictions ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        {predictions ? (
          <>
            From <span className="font-medium">{predictions.fileName}</span> ·{" "}
            {predictions.cards.length} cards · {wellCount} wells · uploaded{" "}
            {new Date(predictions.uploadedAt).toLocaleString("en-US")}.
          </>
        ) : (
          <>
            Default data: the{" "}
            <span className="font-medium">
              {defaultPredictions!.cards.length} sample cards
            </span>{" "}
            · {wellCount} wells. Upload predictions on the{" "}
            <Link href="/" className="underline">
              Dynocard Classifier
            </Link>{" "}
            or{" "}
            <Link href="/explorer" className="underline">
              Explorer
            </Link>{" "}
            to replace the default with your own file.
          </>
        )}{" "}
        {hint}
      </span>
      {predictions && (
        <Button
          variant="ghost"
          size="sm"
          className="-my-0.5 h-6 shrink-0 px-2 text-xs"
          onClick={clear}
        >
          <X className="h-3 w-3" /> Use default data
        </Button>
      )}
    </p>
  );
}
