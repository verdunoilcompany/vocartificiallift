"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { Data } from "plotly.js";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cssColor } from "@/app/hooks/useCssColor";
import { useApi } from "@/app/hooks/useApi";
import { addDays } from "@/lib/lift/dates";
import type { TrendPoint, WellsResponse } from "@/types/lift";
import { ControlsBar, useWellFilters } from "./Controls";
import { PageTitle } from "./PageTitle";
import { PlotlyChart } from "./PlotlyChart";
import { EmptyState, ErrorState } from "./StatusStates";
import { WellList, useWellSelection } from "./WellList";

interface Range {
  start: string;
  end: string;
}

interface ChartSpec {
  title: string;
  x: keyof TrendPoint;
  y: keyof TrendPoint;
  xTitle: string;
  yTitle: string;
}

const CHARTS: ChartSpec[] = [
  {
    title: "Fillage vs. Cycles",
    x: "pumpOffCycles",
    y: "fillage",
    xTitle: "Pump-off cycles",
    yTitle: "Fillage %",
  },
  {
    title: "Avg Effective SPM vs. Production",
    x: "avgSpm",
    y: "oil",
    xTitle: "Avg effective SPM",
    yTitle: "Oil (bbl/d)",
  },
];

export function ReviewDashboard() {
  const params = useSearchParams();
  const wellsApi = useApi<WellsResponse>("/api/lift/wells");
  const wells = useMemo(() => wellsApi.data?.wells ?? [], [wellsApi.data]);
  const filters = useWellFilters(wells);
  const selection = useWellSelection(params.get("well"));
  const [analysis, setAnalysis] = useState<Range | null>(null);
  const [comparison, setComparison] = useState<Range | null>(null);

  // Defaults: the last 90 days vs. the 180 days before that.
  useEffect(() => {
    const latest = wellsApi.data?.latestDate;
    if (!latest || analysis) return;
    setAnalysis({ start: addDays(latest, -89), end: latest });
    setComparison({ start: addDays(latest, -270), end: addDays(latest, -90) });
  }, [wellsApi.data, analysis]);

  const names = [...selection.selected].sort().join("|");
  const q = (r: Range | null) =>
    r && names
      ? `/api/lift/trend?${new URLSearchParams({ start: r.start, end: r.end, wells: names }).toString()}`
      : null;
  const a = useApi<{ points: TrendPoint[] }>(q(analysis));
  const c = useApi<{ points: TrendPoint[] }>(q(comparison));

  // Shared axis ranges so the two periods are directly comparable.
  const ranges = useMemo(() => {
    const all = [...(a.data?.points ?? []), ...(c.data?.points ?? [])].filter(
      (p) => p.wellCount > 0,
    );
    return Object.fromEntries(
      CHARTS.flatMap((ch) =>
        [ch.x, ch.y].map((k) => {
          const vals = all.map((p) => p[k] as number);
          const max = vals.length ? Math.max(...vals) : 1;
          return [k, [0, max * 1.08 || 1]];
        }),
      ),
    ) as Record<string, [number, number]>;
  }, [a.data, c.data]);

  return (
    <div className="grid w-full gap-5 px-4 py-6 md:px-6">
      <PageTitle
        title="Review"
        description="Compare how the selected wells behaved in two time windows, e.g. before and after a setpoint or ASPM change."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={selection.reset}
            disabled={selection.selected.size === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Well Selection
          </Button>
        }
      />

      <ControlsBar
        wellFilters={filters}
        filterKeys={[
          "pumpingUnit",
          "level1",
          "level2",
          "level3",
          "automationStatus",
          "optimizationMode",
        ]}
      />

      {wellsApi.error ? (
        <ErrorState message={wellsApi.error} onRetry={wellsApi.retry} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <WellList
            wells={filters.filtered}
            isLoading={wellsApi.isLoading}
            filtersActive={filters.active}
            selected={selection.selected}
            onToggle={selection.toggle}
            analyseHref={(w) => `/trends?well=${encodeURIComponent(w)}`}
          />
          <div className="grid content-start gap-5 lg:grid-cols-2">
            <RangePicker
              title="Analysis Time"
              value={analysis}
              onChange={setAnalysis}
              max={wellsApi.data?.latestDate}
            />
            <RangePicker
              title="Comparison Time"
              value={comparison}
              onChange={setComparison}
              max={wellsApi.data?.latestDate}
            />
            {CHARTS.map((ch) =>
              [
                { key: "analysis", api: a, color: "--stroke-up" },
                { key: "comparison", api: c, color: "--stroke-down" },
              ].map(({ key, api, color }) => (
                <Card key={`${ch.title}-${key}`} className="p-4">
                  <h2 className="text-center text-lg text-muted-foreground">
                    {ch.title}{" "}
                    <span className="text-xs font-normal">
                      ({key === "analysis" ? "analysis" : "comparison"})
                    </span>
                  </h2>
                  {selection.selected.size === 0 ? (
                    <EmptyState detail="Select a well in the Well List" />
                  ) : api.error ? (
                    <ErrorState message={api.error} onRetry={api.retry} />
                  ) : api.isLoading || !api.data ? (
                    <Skeleton className="mt-3 h-[300px] w-full" />
                  ) : api.data.points.every((p) => p.wellCount === 0) ? (
                    <EmptyState detail="The selected wells were not producing in this window" />
                  ) : (
                    <PlotlyChart
                      label={`${ch.title}, ${key} window`}
                      testId={`review-${key}-${ch.x}`}
                      className="h-[320px]"
                      deps={[api.data, ranges]}
                      figure={() => {
                        const pts = api.data!.points.filter(
                          (p) => p.wellCount > 0,
                        );
                        return {
                          data: [
                            {
                              type: "scatter",
                              mode: "markers",
                              x: pts.map((p) => p[ch.x] as number),
                              y: pts.map((p) => p[ch.y] as number),
                              text: pts.map((p) => p.date),
                              marker: {
                                color: cssColor(color, 0.7),
                                size: 7,
                                line: { width: 0 },
                              },
                              hovertemplate: `%{text}<br>${ch.xTitle}: %{x:,.2f}<br>${ch.yTitle}: %{y:,.2f}<extra></extra>`,
                            } as Data,
                          ],
                          layout: {
                            showlegend: false,
                            margin: { l: 56, r: 16, t: 8, b: 48 },
                            xaxis: {
                              title: { text: ch.xTitle },
                              range: ranges[ch.x],
                            },
                            yaxis: {
                              title: { text: ch.yTitle },
                              range: ranges[ch.y],
                            },
                          },
                        };
                      }}
                    />
                  )}
                </Card>
              )),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RangePicker({
  title,
  value,
  onChange,
  max,
}: {
  title: string;
  value: Range | null;
  onChange: (r: Range) => void;
  max?: string;
}) {
  const id = title.replace(/\W+/g, "-").toLowerCase();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 w-full text-center font-display text-xl font-semibold">
        {title}
      </legend>
      <div className="flex items-center gap-2">
        <Input
          id={`${id}-start`}
          type="date"
          aria-label={`${title} start`}
          value={value?.start ?? ""}
          max={value?.end}
          onChange={(e) =>
            value &&
            e.target.value &&
            onChange({ ...value, start: e.target.value })
          }
        />
        <span aria-hidden>–</span>
        <Input
          id={`${id}-end`}
          type="date"
          aria-label={`${title} end`}
          value={value?.end ?? ""}
          min={value?.start}
          max={max}
          onChange={(e) =>
            value &&
            e.target.value &&
            onChange({ ...value, end: e.target.value })
          }
        />
      </div>
    </fieldset>
  );
}
