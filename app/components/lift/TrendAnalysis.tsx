"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { Data } from "plotly.js";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cssColor } from "@/app/hooks/useCssColor";
import { useApi } from "@/app/hooks/useApi";
import { ASPM_VAR } from "@/lib/lift/colors";
import { addDays } from "@/lib/lift/dates";
import {
  ASPM_STATES,
  type ProductionStream,
  type TrendPoint,
  type WellsResponse,
} from "@/types/lift";
import {
  ControlDate,
  ControlSelect,
  ControlsBar,
  useWellFilters,
} from "./Controls";
import { PageTitle } from "./PageTitle";
import { PlotlyChart } from "./PlotlyChart";
import { EmptyState, ErrorState } from "./StatusStates";
import { WellList, useWellSelection } from "./WellList";
import { trendQuery } from "./trend-query";

/** Series in the Trends chart. Production volumes use the left axis; everything else the right. */
const SERIES: {
  key: keyof TrendPoint;
  label: string;
  production?: boolean;
  color: string;
}[] = [
  { key: "gas", label: "Gas (Mcf/d)", production: true, color: "#dc2626" },
  { key: "oil", label: "Oil (bbl/d)", production: true, color: "#2E8B57" },
  { key: "water", label: "Water (bbl/d)", production: true, color: "#2563eb" },
  {
    key: "liquid",
    label: "Liquid (bbl/d)",
    production: true,
    color: "#0891b2",
  },
  { key: "uptime", label: "UpTime%", color: "#7c3aed" },
  { key: "pumpOffCycles", label: "PumpOff Cycles", color: "#db2777" },
  { key: "fillage", label: "Fillage%", color: "#ca8a04" },
  { key: "pocFillage", label: "POC Fillage%", color: "#a16207" },
  { key: "avgSpm", label: "Avg SPM", color: "#0d9488" },
  { key: "setpointChanges", label: "Setpoint Changes", color: "#9333ea" },
  {
    key: "pumpIntakePressure",
    label: "Avg Pump Intake Pressure (psi)",
    color: "#4f46e5",
  },
  {
    key: "fluidAbovePump",
    label: "Avg Fluid Above Pump (ft)",
    color: "#0284c7",
  },
  { key: "fluidLoad", label: "Fluid Load%", color: "#65a30d" },
  { key: "rodsInCompression", label: "Rods In Compression", color: "#e11d48" },
  {
    key: "estimatedTotalStrokes",
    label: "Estimated Total Strokes",
    color: "#57534e",
  },
  { key: "bblPerStroke", label: "BBLs per Stroke", color: "#78716c" },
  { key: "wellCount", label: "Well Count", color: "#64748b" },
];

const STREAMS: { value: ProductionStream; label: string }[] = [
  { value: "oil", label: "Oil" },
  { value: "gas", label: "Gas" },
  { value: "water", label: "Water" },
];

type AspmMode = "percent" | "count";

export function TrendAnalysis() {
  const params = useSearchParams();
  const wellsApi = useApi<WellsResponse>("/api/lift/wells");
  const wells = useMemo(() => wellsApi.data?.wells ?? [], [wellsApi.data]);
  const filters = useWellFilters(wells);
  const selection = useWellSelection(params.get("well"));
  const [stream, setStream] = useState<ProductionStream>("oil");
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [aspmMode, setAspmMode] = useState<AspmMode>("percent");

  useEffect(() => {
    const latest = wellsApi.data?.latestDate;
    if (latest && !range)
      setRange({ start: addDays(latest, -364), end: latest });
  }, [wellsApi.data, range]);

  const query = range
    ? trendQuery(
        range.start,
        range.end,
        filters.filtered,
        filters.active,
        selection.selected,
      )
    : null;
  const trendApi = useApi<{ points: TrendPoint[] }>(query);
  const points = trendApi.data?.points ?? [];
  const loading = wellsApi.isLoading || trendApi.isLoading || !range;
  const noWells = !loading && filters.filtered.length === 0;

  return (
    <div className="grid w-full gap-5 px-4 py-6 md:px-6">
      <PageTitle
        title="Trend Analysis"
        description="Daily production and pump metrics over time for the selected wells, or every filtered well when none are selected."
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
          "level1",
          "level2",
          "level3",
          "pumpingUnit",
          "aspmState",
          "optimizationMode",
        ]}
      >
        <ControlSelect
          label="Production"
          value={stream}
          allowAll={false}
          options={STREAMS}
          onChange={(v) => v && setStream(v as ProductionStream)}
        />
        <ControlDate
          label="Start Date"
          value={range?.start ?? ""}
          max={range?.end}
          onChange={(start) => setRange((r) => (r ? { ...r, start } : r))}
        />
        <ControlDate
          label="End Date"
          value={range?.end ?? ""}
          min={range?.start}
          max={wellsApi.data?.latestDate}
          onChange={(end) => setRange((r) => (r ? { ...r, end } : r))}
        />
      </ControlsBar>

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
            analyseHref={(w) => `/review?well=${encodeURIComponent(w)}`}
          />
          <div className="grid content-start gap-5">
            <Card className="p-4">
              <h2 className="text-center text-2xl">Trends</h2>
              <p className="text-center text-xs text-muted-foreground">
                Click a legend item to show or hide that series.
              </p>
              {trendApi.error ? (
                <ErrorState message={trendApi.error} onRetry={trendApi.retry} />
              ) : loading ? (
                <Skeleton className="mt-3 h-[560px] w-full" />
              ) : noWells || points.length === 0 ? (
                <EmptyState />
              ) : (
                <PlotlyChart
                  label="Trends chart"
                  testId="trends-plot"
                  className="h-[580px]"
                  deps={[query, stream, points.length]}
                  figure={() => ({
                    data: SERIES.map(
                      (s) =>
                        ({
                          type: "scatter",
                          mode: "lines",
                          name: s.label,
                          x: points.map((p) => p.date),
                          y: points.map((p) => p[s.key] as number),
                          yaxis: s.production ? "y" : "y2",
                          line: { color: s.color, width: 1.8 },
                          visible: s.key === stream ? true : "legendonly",
                          hovertemplate: `%{y:,.2f}<extra>${s.label}</extra>`,
                        }) as Data,
                    ),
                    layout: {
                      // Legend sits under the chart so it never covers the lines.
                      margin: { l: 64, r: 64, t: 8, b: 150 },
                      legend: {
                        orientation: "h",
                        y: -0.12,
                        yanchor: "top",
                        x: 0,
                        font: { size: 11 },
                      },
                      hovermode: "x unified",
                      xaxis: { type: "date" },
                      yaxis: {
                        title: { text: "Production" },
                        rangemode: "tozero",
                      },
                      yaxis2: {
                        title: { text: "Value" },
                        overlaying: "y",
                        side: "right",
                        showgrid: false,
                        rangemode: "tozero",
                      },
                    },
                  })}
                />
              )}
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select
                  value={aspmMode}
                  onValueChange={(v) => setAspmMode(v as AspmMode)}
                >
                  <SelectTrigger
                    className="w-64"
                    aria-label="ASPM classification view"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      100% ASPM Classification
                    </SelectItem>
                    <SelectItem value="count">
                      ASPM Classification (well count)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {trendApi.error ? null : loading ? (
                <Skeleton className="mt-3 h-[340px] w-full" />
              ) : noWells || points.length === 0 ? (
                <EmptyState />
              ) : (
                <PlotlyChart
                  label="ASPM classification by day"
                  testId="aspm-plot"
                  className="h-[360px]"
                  deps={[query, aspmMode, points.length]}
                  figure={() => ({
                    data: ASPM_STATES.map(
                      (s) =>
                        ({
                          type: "bar",
                          name: s,
                          x: points.map((p) => p.date),
                          y: points.map((p) => {
                            const total =
                              ASPM_STATES.reduce((t, k) => t + p.aspm[k], 0) ||
                              1;
                            return aspmMode === "percent"
                              ? (p.aspm[s] / total) * 100
                              : p.aspm[s];
                          }),
                          marker: { color: cssColor(ASPM_VAR[s]) },
                          hovertemplate:
                            aspmMode === "percent"
                              ? `%{y:.0f}%<extra>${s}</extra>`
                              : `%{y} wells<extra>${s}</extra>`,
                        }) as Data,
                    ),
                    layout: {
                      barmode: "stack",
                      bargap: 0.05,
                      margin: { l: 64, r: 16, t: 8, b: 40 },
                      legend: {
                        orientation: "h",
                        y: 1.12,
                        x: 0.5,
                        xanchor: "center",
                      },
                      xaxis: { type: "date" },
                      yaxis: {
                        title: {
                          text:
                            aspmMode === "percent"
                              ? "ASPM Classification (%)"
                              : "Wells",
                        },
                        range: aspmMode === "percent" ? [0, 100] : undefined,
                      },
                    },
                  })}
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
