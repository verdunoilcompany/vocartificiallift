"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  Inbox,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/app/hooks/useApi";
import { useDynocards } from "@/app/hooks/useDynocards";
import { cn } from "@/lib/utils";
import { ControlSelect } from "@/app/components/lift/Controls";
import { cardMatches, CONDITION_LABELS } from "@/lib/dynocard/conditions";
import { FULL_PUMP } from "@/lib/dynocard/labels";
import {
  defaultCardRange,
  isDay,
  usDay,
  type CardRange,
} from "@/lib/dynocard/card-range";
import { sortByTime, type TimeSort } from "@/lib/dynocard/card-time";
import { PUMP_CONDITIONS, type PumpCondition } from "@/types/lift";
import type { MldbWell } from "@/types/dynocard";
import {
  locateWell,
  matchesHierarchy,
  wellKey,
  type HierarchyFilter,
} from "@/lib/dynocard/well-hierarchy";
import { CardExplorer } from "./CardExplorer";
import { CardRangeFields } from "./CardRangeFields";
import { CardTable } from "./CardTable";
import { CardViewer } from "./CardViewer";
import { LabelFilterChips } from "./LabelFilterChips";
import { LabelGuide } from "./LabelGuide";
import { EMPTY_HIERARCHY, WellHierarchyFilter } from "./WellHierarchyFilter";

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
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Compare choice is remembered per card; switching cards resets it to that card's label.
  const [compare, setCompare] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [showImportance, setShowImportance] = useState(true);
  // Explorer only: area / route / well.
  const [hierarchy, setHierarchy] = useState<HierarchyFilter>(EMPTY_HIERARCHY);
  // Classifier: one MLDB well, or null for all wells.
  const [wellChoice, setWellChoice] = useState<string | null>(null);
  // Classifier: card list order by the card's date and time.
  const [timeSort, setTimeSort] = useState<TimeSort>("desc");

  // Every well with cards in MLDB (Classifier's Well list; maps Explorer names to NodeIDs).
  const wellsApi = useApi<{ wells: MldbWell[] }>("/api/mldb/wells");
  const mldbWells = useMemo(() => wellsApi.data?.wells ?? [], [wellsApi.data]);
  // The single well to load from MLDB, if any (lets the date range go past 14 days).
  const explorerWell = hierarchy.well;
  const serverWell = hierarchyFilter
    ? explorerWell
      ? (mldbWells.find((w) => wellKey(w.well) === wellKey(explorerWell))
          ?.well ?? explorerWell)
      : null
    : wellChoice;
  const {
    cards: loaded,
    model,
    state,
    error,
    rangeProblem,
    range,
    setRange,
    maxDays,
    fetchedAt,
    retry,
  } = useDynocards(serverWell);

  // Links from the Daily Dashboard condition tiles: ?condition=Gas%20Interference[&well=…]
  const params = useSearchParams();
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

  // Dashboard links carry their date range (?from=&to=) and well (?well=): put them into the
  // page's own filters (From / To, Area, Route, Well), then drop them from the address bar so
  // those filters stay free to change. The condition / label stay as the banner filter.
  const urlFrom = params.get("from");
  const urlTo = params.get("to");
  useEffect(() => {
    if (urlFrom === null && urlTo === null && drillWell === null) return;
    const rest = new URLSearchParams(params.toString());
    if (urlFrom !== null || urlTo !== null) {
      if (isDay(urlFrom) && isDay(urlTo))
        setRange({ from: urlFrom, to: urlTo });
      rest.delete("from");
      rest.delete("to");
    }
    if (drillWell !== null) {
      const loc = locateWell(drillWell);
      if (!hierarchyFilter) {
        // Classifier: pick the well in its Well filter.
        setWellChoice(drillWell);
        rest.delete("well");
      } else if (loc) {
        // Explorer: its Area / Route / Well selects (wells off the list keep the banner filter).
        setHierarchy({ area: loc.area, route: loc.route, well: loc.well });
        rest.delete("well");
      }
    }
    setSelectedId(null);
    const q = rest.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [
    urlFrom,
    urlTo,
    drillWell,
    hierarchyFilter,
    params,
    pathname,
    router,
    setRange,
  ]);

  // Explorer: only wells on the Area/Route list, so "All" means every listed well
  // (plus a well a dashboard link asked for, even if it isn't on the list).
  const cards = useMemo(
    () =>
      hierarchyFilter
        ? loaded.filter(
            (c) => locateWell(c.node) || (drillWell && c.node === drillWell),
          )
        : loaded,
    [loaded, hierarchyFilter, drillWell],
  );
  // Well named in the banner: a link's well, or the well now chosen in the filters.
  const bannerWell =
    drillWell ?? (hierarchyFilter ? hierarchy.well : wellChoice);
  // "Show all cards": drop the condition / label and the well, area and route, and go back to
  // the present dates (yesterday–today).
  const clearDrill = () => {
    setWellChoice(null);
    setHierarchy(EMPTY_HIERARCHY);
    setRange(defaultCardRange());
    resetView();
    router.replace(pathname);
  };

  // Explorer area/route/well changed: reset the selected card and drop the label chip if
  // nothing in the new scope has that label.
  const applyHierarchy = (h: HierarchyFilter) => {
    setHierarchy(h);
    setSelectedId(null);
    if (
      filter &&
      !cards.some((c) => c.label === filter && matchesHierarchy(c.node, h))
    )
      setFilter(null);
  };
  // New dates or another well reload the cards: start again from the first card.
  const changeRange = (r: CardRange) => {
    setRange(r);
    resetView();
  };
  const changeWell = (w: string | null) => {
    setWellChoice(w);
    resetView();
  };

  // Area/route/well (Explorer only) first, then the label chips work within that set.
  const scoped = useMemo(
    () =>
      cards.filter(
        (c) =>
          (!drillCondition || cardMatches(drillCondition, c.label)) &&
          (!drillWell || c.node === drillWell) &&
          (!drillLabel ||
            c.label.trim().toLowerCase() === drillLabel.trim().toLowerCase()) &&
          (!hierarchyFilter || matchesHierarchy(c.node, hierarchy)),
      ),
    [cards, hierarchy, hierarchyFilter, drillCondition, drillWell, drillLabel],
  );
  const visible = useMemo(
    () =>
      sortByTime(
        scoped.filter((c) => filter === null || c.label === filter),
        // The Explorer sorts its own grid; the Classifier's list follows the Sort choice.
        gallery ? "file" : timeSort,
        (c) => c.date,
      ),
    [scoped, filter, gallery, timeSort],
  );
  const selected =
    visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const compareLabel =
    selected && compare?.id === selected.id
      ? compare.label
      : selected && model?.ref[selected.label]
        ? selected.label
        : FULL_PUMP;

  const wellCount = useMemo(
    () => new Set(cards.map((c) => c.node)).size,
    [cards],
  );
  const rangeText =
    range.from === range.to
      ? usDay(range.from)
      : `${usDay(range.from)} – ${usDay(range.to)}`;
  const status =
    state === "ready"
      ? `Loaded ${cards.length.toLocaleString("en-US")} cards · ${wellCount} well${wellCount === 1 ? "" : "s"} · ${rangeText}${serverWell ? ` · ${serverWell}` : ""}`
      : state === "loading"
        ? `Loading cards for ${rangeText}…`
        : "";

  function resetView() {
    setFilter(null);
    setSelectedId(null);
  }

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
        <p
          className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            From <span className="font-medium text-foreground">MLDB</span>{" "}
            (dyno.Prediction)
          </span>
          {status && <span data-testid="status">· {status}</span>}
          {fetchedAt && state === "ready" && (
            <span>
              · refreshed{" "}
              {new Date(fetchedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-1 h-8"
            onClick={() => retry()}
            disabled={state === "loading" || state === "invalid"}
          >
            <RefreshCw
              className={cn("h-4 w-4", state === "loading" && "animate-spin")}
            />
            Refresh
          </Button>
        </p>
      </section>

      {hierarchyFilter ? (
        <WellHierarchyFilter
          value={hierarchy}
          onChange={applyHierarchy}
          range={range}
          onRangeChange={changeRange}
          maxDays={maxDays}
          onClear={() => applyHierarchy(EMPTY_HIERARCHY)}
        />
      ) : (
        <Card className="grid gap-3 p-4" aria-label="Card filters">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ControlSelect
              label="Well"
              value={wellChoice}
              options={mldbWells.map((w) => w.well)}
              onChange={changeWell}
            />
            <ControlSelect
              label="Sort by date & time"
              value={timeSort}
              allowAll={false}
              options={[
                { value: "desc", label: "Newest first" },
                { value: "asc", label: "Oldest first" },
              ]}
              onChange={(v) => {
                if (v) setTimeSort(v as TimeSort);
                setSelectedId(null);
              }}
            />
            <CardRangeFields
              range={range}
              onChange={changeRange}
              maxDays={maxDays}
              idPrefix="classifier-range"
              className="sm:col-span-2"
            />
          </div>
          {wellsApi.error && (
            <p className="text-xs text-muted-foreground">
              The well list could not be loaded; showing all wells.
            </p>
          )}
        </Card>
      )}

      {state === "invalid" && (
        <Alert className="max-w-xl">
          <CalendarRange className="h-4 w-4" />
          <AlertTitle>Change the dates</AlertTitle>
          <AlertDescription>{rangeProblem}</AlertDescription>
        </Alert>
      )}

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
            <EmptyState rangeText={rangeText} well={serverWell} />
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
                    {bannerWell && (
                      <>
                        {" "}
                        for <span className="font-semibold">{bannerWell}</span>
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
                  <Button variant="ghost" size="sm" onClick={clearDrill}>
                    Show all cards
                  </Button>
                </div>
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
                  key={`${range.from}|${range.to}|${serverWell ?? ""}`}
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

function EmptyState({
  rangeText,
  well,
}: {
  rangeText: string;
  well: string | null;
}) {
  return (
    <Card className="grid max-w-xl justify-items-start gap-2 p-6">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h2 className="text-xl">No cards to show</h2>
      <p className="text-sm text-muted-foreground">
        MLDB has no cards{well ? ` for ${well}` : ""} from {rangeText}. Try
        other dates{well ? " or another well" : ""}.
      </p>
    </Card>
  );
}
