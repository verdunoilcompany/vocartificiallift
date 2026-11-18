"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDynocards } from "@/app/hooks/useDynocards";
import { useUploadedPredictions } from "@/app/contexts/UploadedPredictionsContext";
import { cardMatches, CONDITION_LABELS } from "@/lib/dynocard/conditions";
import { FULL_PUMP } from "@/lib/dynocard/labels";
import { PUMP_CONDITIONS, type PumpCondition } from "@/types/lift";
import { inDateRange, type DateRange } from "@/lib/dynocard/card-time";
import {
  matchesHierarchy,
  type HierarchyFilter,
} from "@/lib/dynocard/well-hierarchy";
import { CardExplorer } from "./CardExplorer";
import { CardTable } from "./CardTable";
import { CardToolbar } from "./CardToolbar";
import { CardViewer } from "./CardViewer";
import { LabelFilterChips } from "./LabelFilterChips";
import { LabelGuide } from "./LabelGuide";
import {
  EMPTY_DATE_RANGE,
  EMPTY_HIERARCHY,
  WellHierarchyFilter,
} from "./WellHierarchyFilter";

interface DynocardReviewProps {
  /** Page heading; the Explorer reuses this page under its own name. */
  title?: string;
  /** Show the Area / Route / Well filters (Dynocard Explorer). */
  hierarchyFilter?: boolean;
  /** Replace the table + single viewer with the paged multi-card grid (Dynocard Explorer). */
  gallery?: boolean;
}

export function DynocardReview({
  title = "Dynocard Classifier Review",
  hierarchyFilter = false,
  gallery = false,
}: DynocardReviewProps) {
  const {
    cards,
    model,
    state,
    error,
    source,
    uploading,
    upload,
    showSample,
    retry,
  } = useDynocards();
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Compare choice is remembered per card; switching cards resets it to that card's label.
  const [compare, setCompare] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [showImportance, setShowImportance] = useState(true);
  const [hierarchy, setHierarchy] = useState<HierarchyFilter>(EMPTY_HIERARCHY);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);

  // Links from the Daily Dashboard condition tiles: ?condition=Gas%20Interference[&well=…]
  const params = useSearchParams();
  const { predictions: uploadedPredictions } = useUploadedPredictions();
  const router = useRouter();
  const pathname = usePathname();
  const conditionParam = params.get("condition");
  const drillCondition = PUMP_CONDITIONS.includes(
    conditionParam as PumpCondition,
  )
    ? (conditionParam as PumpCondition)
    : null;
  const drillWell = params.get("well");
  // A model label (e.g. ?label=Full%20Pump), for links that aren't one of the 13 conditions.
  const drillLabel = params.get("label");
  const clearDrill = () => {
    setSelectedId(null);
    router.replace(pathname);
  };

  const inScope = (
    c: (typeof cards)[number],
    h: HierarchyFilter,
    d: DateRange,
  ) => matchesHierarchy(c.node, h) && inDateRange(c.date, d);

  // Explorer filters changed: reset the selected card and drop the label chip if nothing in
  // the new scope has that label.
  const applyScope = (h: HierarchyFilter, d: DateRange) => {
    setHierarchy(h);
    setDateRange(d);
    setSelectedId(null);
    if (filter && !cards.some((c) => c.label === filter && inScope(c, h, d)))
      setFilter(null);
  };

  // Area/route/well and date filters first (Explorer only), then the label chips work within that set.
  const scoped = useMemo(
    () =>
      cards.filter(
        (c) =>
          (!drillCondition || cardMatches(drillCondition, c.label)) &&
          (!drillWell || c.node === drillWell) &&
          (!drillLabel ||
            c.label.trim().toLowerCase() === drillLabel.trim().toLowerCase()) &&
          (!hierarchyFilter ||
            (matchesHierarchy(c.node, hierarchy) &&
              inDateRange(c.date, dateRange))),
      ),
    [
      cards,
      hierarchy,
      dateRange,
      hierarchyFilter,
      drillCondition,
      drillWell,
      drillLabel,
    ],
  );
  const visible = useMemo(
    () => scoped.filter((c) => filter === null || c.label === filter),
    [scoped, filter],
  );
  const selected =
    visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const compareLabel =
    selected && compare?.id === selected.id
      ? compare.label
      : selected && model?.ref[selected.label]
        ? selected.label
        : FULL_PUMP;

  const status =
    state !== "ready"
      ? ""
      : source.kind === "upload"
        ? `Loaded ${cards.length} cards from ${source.fileName}.`
        : `Showing ${cards.length} sample cards.`;

  const resetView = () => {
    setFilter(null);
    setSelectedId(null);
  };

  return (
    <div className="grid w-full gap-6 px-4 py-6 md:px-6">
      <section className="grid gap-2" aria-labelledby="page-title">
        <span className="eyebrow">Verdun · Rod pump downhole cards</span>
        <h1 id="page-title" className="text-4xl leading-none">
          {title}
        </h1>
        <p className="max-w-[72ch] text-muted-foreground">
          Each card is gridded and binned into 50 loads: L0–L24 going up,
          L25–L49 coming down.{" "}
          {gallery
            ? "Browse many cards at once, each shown large with its full details."
            : "Pick a card to see its shape next to the typical shape of the label the model chose."}
        </p>
        <div className="pt-2">
          <CardToolbar
            uploading={uploading}
            status={status}
            onUpload={async (f) => {
              if (await upload(f)) resetView();
            }}
            onShowSample={async () => {
              await showSample();
              resetView();
            }}
          />
        </div>
      </section>

      {state === "loading" && <LoadingState />}

      {state === "error" && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load the cards</AlertTitle>
          <AlertDescription className="grid gap-3">
            <p>{error}</p>
            <div>
              <Button variant="outline" size="sm" onClick={() => void retry()}>
                <RotateCcw /> Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {state === "ready" && model && (
        <>
          {cards.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {(drillCondition || drillWell || drillLabel) && (
                <div
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
                  data-testid="drill-banner"
                >
                  <span>
                    Showing{" "}
                    <span className="font-semibold">
                      {drillCondition ?? drillLabel ?? "all"}
                    </span>{" "}
                    cards
                    {drillWell && (
                      <>
                        {" "}
                        for <span className="font-semibold">{drillWell}</span>
                      </>
                    )}{" "}
                    · {scoped.length} card{scoped.length === 1 ? "" : "s"}
                    {drillCondition && (
                      <span className="text-muted-foreground">
                        {" "}
                        (model label:{" "}
                        {drillCondition === "Bad Data"
                          ? "any label other than Full Pump"
                          : CONDITION_LABELS[drillCondition].join(", ")}
                        )
                      </span>
                    )}
                  </span>
                  {uploadedPredictions && source.kind !== "upload" && (
                    <span className="text-destructive">
                      The uploaded file isn&apos;t loaded here, so this is
                      filtering the sample cards. Upload the file again.
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearDrill}>
                    Show all cards
                  </Button>
                </div>
              )}
              {hierarchyFilter && (
                <WellHierarchyFilter
                  cards={cards}
                  value={hierarchy}
                  matching={scoped.length}
                  onChange={(h) => applyScope(h, dateRange)}
                  dateRange={dateRange}
                  onDateRangeChange={(d) => applyScope(hierarchy, d)}
                  onClear={() => applyScope(EMPTY_HIERARCHY, EMPTY_DATE_RANGE)}
                />
              )}
              <LabelFilterChips
                cards={scoped}
                filter={filter}
                onChange={(f) => {
                  setFilter(f);
                  setSelectedId(null);
                }}
              />
              {gallery ? (
                <CardExplorer
                  key={source.kind === "upload" ? source.fileName : "sample"}
                  cards={visible}
                  model={model}
                />
              ) : (
                <section
                  aria-label="Cards and viewer"
                  className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]"
                >
                  <Card className="overflow-hidden">
                    <CardTable
                      cards={visible}
                      selectedId={selected?.id ?? null}
                      onSelect={setSelectedId}
                    />
                  </Card>
                  {selected ? (
                    <CardViewer
                      card={selected}
                      model={model}
                      compareLabel={compareLabel}
                      onCompareChange={(label) =>
                        setCompare({ id: selected.id, label })
                      }
                      showImportance={showImportance}
                      onShowImportanceChange={setShowImportance}
                    />
                  ) : (
                    <Card className="grid place-items-center p-10 text-muted-foreground">
                      No cards match this filter.
                    </Card>
                  )}
                </section>
              )}
            </>
          )}
          <LabelGuide model={model} />
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading cards">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="grid max-w-xl justify-items-start gap-2 p-6">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h2 className="text-xl">No cards to show</h2>
      <p className="text-sm text-muted-foreground">
        Load a predictions file with columns L0–L49 and PredictedLabel, or show
        the sample cards.
      </p>
    </Card>
  );
}
