"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw } from "lucide-react";
import type { Data } from "plotly.js";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cssColor } from "@/app/hooks/useCssColor";
import { useApi } from "@/app/hooks/useApi";
import { useMldbLabels } from "@/app/hooks/useMldbLabels";
import { ASPM_VAR } from "@/lib/lift/colors";
import { cn } from "@/lib/utils";
import {
  type DailyRow,
  type ProductionStream,
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
import { ConditionTiles } from "./ConditionTiles";
import { StatTile } from "./StatTile";
import { WellConditionTable } from "./WellConditionTable";
import { WellStatusTable } from "./WellStatusTable";
import { EmptyState, ErrorState } from "./StatusStates";

const STREAMS: { value: ProductionStream; label: string; unit: string }[] = [
  { value: "oil", label: "Oil", unit: "bbl/d" },
  { value: "gas", label: "Gas", unit: "Mcf/d" },
  { value: "water", label: "Water", unit: "bbl/d" },
];

const AUTOMATION_COLORS: Record<string, string> = {
  Auto: "--aspm-dialed",
  Manual: "--aspm-under",
  Off: "--aspm-unclassified",
};
const COMM_COLORS: Record<string, string> = {
  Online: "--aspm-dialed",
  Offline: "--aspm-over",
  Null: "--aspm-undefined",
};

const fmt = (v: number, d = 2) =>
  v.toLocaleString("en-US", { maximumFractionDigits: d });

/** Numeric table cell renderer. */
function num(d = 2) {
  return function NumCell({ getValue }: { getValue: () => unknown }) {
    const v = getValue() as number | null;
    return (
      <span className="font-mono tabular">
        {v === null || v === undefined ? "" : fmt(v, d)}
      </span>
    );
  };
}

export function DailyDashboard() {
  const params = useSearchParams();
  const wellsApi = useApi<WellsResponse>("/api/lift/wells");
  const wells = useMemo(() => wellsApi.data?.wells ?? [], [wellsApi.data]);
  const [date, setDate] = useState<string | null>(null);
  const [stream, setStream] = useState<ProductionStream>("oil");
  const [selected, setSelected] = useState<string | null>(params.get("well"));
  const filters = useWellFilters(wells);
  // Dynocard predictions from MLDB for the shared date range (tiles + per-well table).
  const mldb = useMldbLabels();

  useEffect(() => {
    if (wellsApi.data && !date) setDate(wellsApi.data.latestDate);
  }, [wellsApi.data, date]);

  const dailyApi = useApi<{ rows: DailyRow[] }>(
    date ? `/api/lift/daily?date=${date}` : null,
  );

  const names = useMemo(
    () => new Set(filters.filtered.map((w) => w.name)),
    [filters.filtered],
  );
  const rows = useMemo(
    () => (dailyApi.data?.rows ?? []).filter((r) => names.has(r.well)),
    [dailyApi.data, names],
  );
  // Tiles and pies follow the selected well when there is one, otherwise everything filtered.
  const scope = useMemo(
    () => (selected ? rows.filter((r) => r.well === selected) : rows),
    [rows, selected],
  );
  const streamInfo = STREAMS.find((s) => s.value === stream)!;

  const loading = wellsApi.isLoading || dailyApi.isLoading || !date;
  const error = wellsApi.error ?? dailyApi.error;

  return (
    <div className="grid w-full gap-5 px-4 py-6 md:px-6">
      <PageTitle
        title="Daily Dashboard"
        description="Production, pump conditions and well status for one production date."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(null)}
            disabled={!selected}
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
          "optimizationMode",
          "automationStatus",
        ]}
      >
        <ControlDate
          label="Production Date"
          value={date ?? ""}
          max={wellsApi.data?.latestDate}
          onChange={setDate}
        />
        <ControlSelect
          label="Production"
          value={stream}
          allowAll={false}
          options={STREAMS.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) => v && setStream(v as ProductionStream)}
        />
      </ControlsBar>

      {error ? (
        <ErrorState
          message={error}
          onRetry={wellsApi.error ? wellsApi.retry : dailyApi.retry}
        />
      ) : (
        <>
          <section
            className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,12rem)_minmax(0,1fr)]"
            aria-label="Summary"
          >
            <ProductionCard
              rows={scope}
              stream={stream}
              unit={streamInfo.unit}
              loading={loading}
            />
            <StatTile
              label={selected ? "Well Selected" : "Total Well Count"}
              value={loading ? "…" : selected ? selected : rows.length}
            />
            <ConditionTiles mldb={mldb} />
          </section>

          <section
            className="grid gap-4 lg:grid-cols-3"
            aria-label="Status breakdown"
          >
            <PieCard
              title="Automation Status"
              rows={scope}
              loading={loading}
              field={(r) => r.automationStatus}
              colors={AUTOMATION_COLORS}
            />
            <PieCard
              title="Classification"
              rows={scope}
              loading={loading}
              field={(r) => r.classification}
              colors={ASPM_VAR}
            />
            <PieCard
              title="Comm Status"
              rows={scope}
              loading={loading}
              field={(r) => r.commStatus}
              colors={COMM_COLORS}
            />
          </section>

          <DailyTable
            rows={rows}
            loading={loading}
            stream={streamInfo}
            selected={selected}
            onSelect={(w) => setSelected((s) => (s === w ? null : w))}
          />
        </>
      )}

      {/* Live data from XSPOC; independent of the sample-data controls above. */}
      <WellStatusTable />

      {/* Per-well card counts for each condition (MLDB); same source as the condition tiles. */}
      <WellConditionTable mldb={mldb} />
    </div>
  );
}

function ProductionCard({
  rows,
  stream,
  unit,
  loading,
}: {
  rows: DailyRow[];
  stream: ProductionStream;
  unit: string;
  loading: boolean;
}) {
  const actual = rows.reduce((s, r) => s + r[stream], 0);
  const target = rows.reduce((s, r) => s + r[`${stream}Target`], 0);
  const delta = actual - target;
  const pct = target > 0 ? (delta / target) * 100 : null;
  return (
    <Card className="flex flex-col justify-center gap-2 p-5 text-center">
      {loading ? (
        <Skeleton className="mx-auto h-16 w-40" />
      ) : target <= 0 ? (
        <EmptyState
          title="No results"
          detail="There was not enough data to perform this calculation"
        />
      ) : (
        <>
          <span className="eyebrow">Production vs target</span>
          <span className="font-display text-3xl font-semibold tabular">
            {fmt(actual, 1)}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {unit}
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            Target {fmt(target, 1)} {unit}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-medium",
              delta >= 0 ? "text-good" : "text-destructive",
            )}
          >
            {delta >= 0 ? "+" : ""}
            {fmt(delta, 1)} (
            {pct === null ? "–" : `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`})
          </span>
        </>
      )}
    </Card>
  );
}

function PieCard({
  title,
  rows,
  field,
  colors,
  loading,
}: {
  title: string;
  rows: DailyRow[];
  field: (r: DailyRow) => string;
  colors: Record<string, string>;
  loading: boolean;
}) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(field(r), (counts.get(field(r)) ?? 0) + 1);
  const labels = [...counts.keys()].sort();
  const values = labels.map((l) => counts.get(l)!);
  return (
    <Card className="p-4">
      <h2 className="text-center text-xl">{title}</h2>
      {loading ? (
        <Skeleton className="mt-3 h-[260px] w-full" />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <PlotlyChart
          label={`${title}: ${labels.map((l, i) => `${l} ${values[i]}`).join(", ")}`}
          deps={[labels.join("|"), values.join("|")]}
          className="h-[280px]"
          figure={() => ({
            data: [
              {
                type: "pie",
                labels,
                values,
                marker: {
                  colors: labels.map((l) =>
                    cssColor(colors[l] ?? "--aspm-undefined"),
                  ),
                  line: { color: cssColor("--card"), width: 2 },
                },
                textinfo: "value",
                sort: false,
                hovertemplate:
                  "%{label}: %{value} wells (%{percent})<extra></extra>",
              } as Data,
            ],
            layout: {
              margin: { l: 8, r: 8, t: 8, b: 8 },
              legend: { orientation: "v", x: 1, y: 1 },
            },
          })}
        />
      )}
    </Card>
  );
}

function DailyTable({
  rows,
  loading,
  stream,
  selected,
  onSelect,
}: {
  rows: DailyRow[];
  loading: boolean;
  stream: (typeof STREAMS)[number];
  selected: string | null;
  onSelect: (well: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<DailyRow>[]>(
    () => [
      {
        accessorKey: "well",
        header: "Well Name",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        id: "analyse",
        header: "Analyse Well",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/trend-analysis?well=${encodeURIComponent(row.original.well)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sky-700 underline underline-offset-2 dark:text-sky-400"
          >
            Link
          </Link>
        ),
      },
      {
        id: "prod",
        accessorFn: (r) => r[stream.value],
        header: `${stream.label} Production`,
        cell: num(),
      },
      {
        id: "target",
        accessorFn: (r) => r[`${stream.value}Target`],
        header: `${stream.label} Production Target`,
        cell: num(),
      },
      {
        id: "delta",
        accessorFn: (r) => r[stream.value] - r[`${stream.value}Target`],
        header: "Production Delta",
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return (
            <span
              className={cn(
                "font-mono tabular",
                v < 0 ? "text-destructive" : "text-good",
              )}
            >
              {fmt(v)}
            </span>
          );
        },
      },
      { accessorKey: "cycles", header: "Cycles", cell: num(0) },
      { accessorKey: "automationStatus", header: "Automation Status" },
      { accessorKey: "classification", header: "Classification" },
      { accessorKey: "avgSpm", header: "Avg SPM", cell: num() },
      { accessorKey: "idleTime", header: "Idle Time (min)", cell: num(0) },
      { accessorKey: "pocStatus", header: "POC Status" },
      { accessorKey: "commStatus", header: "Comm Status" },
      {
        accessorKey: "dailyCardCount",
        header: "Daily Card Count",
        cell: num(0),
      },
      { accessorKey: "fillage", header: "Fillage%", cell: num() },
      { accessorKey: "pocFillage", header: "POC Fillage%", cell: num() },
      { accessorKey: "runTime", header: "Run Time%", cell: num(1) },
      {
        accessorKey: "pumpIntakePressure",
        header: "Pump Intake Pressure (psi)",
        cell: num(),
      },
      {
        accessorKey: "rodsInCompression",
        header: "Rods in Compression",
        cell: num(0),
      },
      {
        accessorKey: "fluidAbovePump",
        header: "Fluid Above Pump (ft)",
        cell: num(0),
      },
      {
        accessorKey: "estimatedTotalStrokes",
        header: "Estimated Total Strokes",
        cell: num(),
      },
    ],
    [stream],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (r) => r.well,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="overflow-hidden">
      <div className="max-h-[520px] overflow-auto">
        <Table aria-label="Wells for the production date">
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const s = h.column.getIsSorted();
                  const Icon =
                    s === "asc"
                      ? ArrowUp
                      : s === "desc"
                        ? ArrowDown
                        : ArrowUpDown;
                  const label = flexRender(
                    h.column.columnDef.header,
                    h.getContext(),
                  );
                  return (
                    <TableHead
                      key={h.id}
                      className="min-w-[6.5rem] whitespace-normal text-center align-middle"
                    >
                      {h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 py-1 font-semibold leading-tight text-foreground"
                        >
                          {label}
                          <Icon
                            className="h-3 w-3 shrink-0 opacity-60"
                            aria-hidden
                          />
                        </button>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {label}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  No wells match these controls.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSel = row.id === selected;
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSel ? "selected" : undefined}
                    aria-selected={isSel}
                    tabIndex={0}
                    onClick={() => onSelect(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(row.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isSel && "shadow-[inset_3px_0_0_hsl(var(--primary))]",
                    )}
                  >
                    {row.getVisibleCells().map((c) => (
                      <TableCell
                        key={c.id}
                        className="whitespace-nowrap py-1.5 text-center"
                      >
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
