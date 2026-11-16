"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileDown,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ControlSelect } from "@/app/components/lift/Controls";
import { ErrorState } from "@/app/components/lift/StatusStates";
import { useApi } from "@/app/hooks/useApi";
import { apiUrl } from "@/lib/api";
import {
  MORNING_COLUMNS,
  csvFileName,
  formatCell,
  toCsv,
  type Tone,
} from "@/lib/xspoc/morning-report-columns";
import { cn } from "@/lib/utils";
import type {
  MorningReportResponse,
  MorningReportRow,
  MorningSnapshot,
  MorningSnapshotInfo,
} from "@/types/xspoc";

const LIVE = "live";
const AUTO_REFRESH_MS = 5 * 60_000;
const AUTO_DL_KEY = "voc-morning-autodownload";
const AUTO_DL_LAST_KEY = "voc-morning-autodownload-last";

const TONE_CLASS: Record<Exclude<Tone, null>, string> = {
  shutdown: "bg-red-600 font-medium text-white",
  idle: "bg-yellow-300 text-neutral-900",
  alarm: "bg-red-600 font-medium text-white",
  notice: "bg-cyan-300 text-neutral-900",
};

const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
};

function downloadCsv(rows: MorningReportRow[], fileName: string) {
  const url = URL.createObjectURL(
    new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const timeText = (iso: string) => new Date(iso).toLocaleTimeString("en-US");
const dateLabel = (s: MorningSnapshotInfo) => {
  const [y, m, d] = s.date.split("-");
  const at = new Date(s.capturedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `6 AM report · ${m}/${d}/${y}${s.late ? ` (saved ${at})` : ""}`;
};

const columns: ColumnDef<MorningReportRow>[] = MORNING_COLUMNS.map((c) => ({
  id: c.key,
  accessorFn: (r) => r[c.key],
  header: c.header,
  enableColumnFilter:
    c.kind === "text" || c.kind === "datetime" || c.kind === "date",
  filterFn: (row, _id, value: string) =>
    formatCell(row.original, c).toLowerCase().includes(value.toLowerCase()),
  sortUndefined: "last",
}));

/** XSPOC morning report (AT1 West / East / Central) with live refresh, 6 AM snapshots and CSV export. */
export function MorningReport() {
  const [view, setView] = useState<string>(LIVE);
  const [area, setArea] = useState<string | null>(null);
  const [well, setWell] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const live = useApi<MorningReportResponse>(
    view === LIVE ? "/api/xspoc/morning-report" : null,
  );
  const snap = useApi<MorningSnapshot>(
    view === LIVE ? null : `/api/xspoc/morning-report/snapshots/${view}`,
  );
  const snapshots = useApi<{ snapshots: MorningSnapshotInfo[] }>(
    "/api/xspoc/morning-report/snapshots",
  );
  const { retry: refreshLive } = live;
  const { retry: refreshSnapshots } = snapshots;

  const current = view === LIVE ? live : snap;
  const allRows = useMemo(
    () => (view === LIVE ? live.data?.rows : snap.data?.rows) ?? [],
    [view, live.data, snap.data],
  );
  const asOf = view === LIVE ? live.data?.fetchedAt : snap.data?.capturedAt;
  const list = snapshots.data?.snapshots ?? [];

  const areas = useMemo(
    () => [...new Set(allRows.map((r) => r.area))].sort(),
    [allRows],
  );
  const wells = useMemo(
    () => allRows.filter((r) => !area || r.area === area).map((r) => r.well),
    [allRows, area],
  );
  const rows = useMemo(
    () =>
      allRows.filter(
        (r) => (!area || r.area === area) && (!well || r.well === well),
      ),
    [allRows, area, well],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowId: (r) => `${r.area}|${r.well}`,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const shown = table.getRowModel().rows;

  const refresh = () => {
    if (view === LIVE) refreshLive();
    else snap.retry();
    refreshSnapshots();
  };

  // Live auto-refresh, like XSPOC's "Auto Refresh" box.
  useEffect(() => {
    if (!autoRefresh || view !== LIVE) return;
    const t = setInterval(refreshLive, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh, view, refreshLive]);

  const exportCsv = () =>
    downloadCsv(
      shown.map((r) => r.original),
      csvFileName(
        well ?? area,
        asOf ? new Date(asOf) : new Date(),
        view === LIVE ? "Morning_Report" : "Morning_Report_6AM",
      ),
    );

  const downloadSnapshot = useCallback(async (date: string) => {
    const res = await fetch(
      apiUrl(`/api/xspoc/morning-report/snapshots/${date}`),
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`No 6 AM report for ${date}.`);
    const s = (await res.json()) as MorningSnapshot;
    downloadCsv(
      s.rows,
      csvFileName(null, new Date(s.capturedAt), "Morning_Report_6AM"),
    );
  }, []);

  // Optional: download today's 6 AM report automatically (once a day) while this page is open.
  useEffect(() => setAutoDownload(storage.get(AUTO_DL_KEY) === "1"), []);
  useEffect(() => {
    if (!autoDownload) return;
    const check = async () => {
      const today = localToday();
      if (new Date().getHours() < 6 || storage.get(AUTO_DL_LAST_KEY) === today)
        return;
      try {
        // Listing first lets the server capture today's report if it hasn't yet.
        await fetch(apiUrl("/api/xspoc/morning-report/snapshots"), {
          cache: "no-store",
        });
        await downloadSnapshot(today);
        storage.set(AUTO_DL_LAST_KEY, today);
        refreshSnapshots();
      } catch {
        /* not available yet; try again next minute */
      }
    };
    void check();
    const t = setInterval(() => void check(), 60_000);
    return () => clearInterval(t);
  }, [autoDownload, downloadSnapshot, refreshSnapshots]);

  const latest = list[0];

  return (
    <div className="grid w-full gap-5 px-4 py-6 md:px-6">
      <section className="grid gap-1" aria-labelledby="page-title">
        <span className="eyebrow">
          Verdun · XSPOC · AT1 West / East / Central
        </span>
        <h1 id="page-title" className="text-4xl leading-none">
          Morning Reports
        </h1>
        <p className="max-w-[80ch] text-muted-foreground">
          Live well status from XSPOC. A copy is saved every day at 6:00 AM so
          the morning report can be downloaded later in the day.
        </p>
      </section>

      <Card className="grid gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1">
            <Label htmlFor="report-view" className="text-xs font-semibold">
              Report
            </Label>
            <Select
              value={view}
              onValueChange={(v) => {
                setView(v);
                setColumnFilters([]);
              }}
            >
              <SelectTrigger
                id="report-view"
                className="h-8 text-xs"
                data-testid="report-view"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LIVE}>Live (current data)</SelectItem>
                {list.map((s) => (
                  <SelectItem key={s.date} value={s.date}>
                    {dateLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ControlSelect
            label="Area"
            value={area}
            options={areas}
            onChange={(a) => {
              setArea(a);
              if (
                well &&
                a &&
                !allRows.some((r) => r.well === well && r.area === a)
              )
                setWell(null);
            }}
          />
          <ControlSelect
            label="Well"
            value={well}
            options={wells}
            onChange={setWell}
          />
          <div className="grid content-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={refresh}
              disabled={current.isLoading}
            >
              <RefreshCw className={cn(current.isLoading && "animate-spin")} />{" "}
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={exportCsv}
              disabled={shown.length === 0}
              data-testid="export-csv"
            >
              <FileDown /> Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!latest}
              onClick={() =>
                latest &&
                void downloadSnapshot(view === LIVE ? latest.date : view)
              }
              data-testid="download-6am"
              title={latest ? undefined : "No 6 AM report has been saved yet"}
            >
              <Download /> Download 6 AM report
              {latest && (
                <span className="font-mono text-xs opacity-70">
                  {(view === LIVE ? latest.date : view).slice(5)}
                </span>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-download"
                checked={autoDownload}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setAutoDownload(on);
                  storage.set(AUTO_DL_KEY, on ? "1" : "0");
                }}
              />
              <Label
                htmlFor="auto-download"
                className="flex cursor-pointer items-center gap-1 font-normal"
              >
                <AlarmClock className="h-4 w-4" aria-hidden /> Auto-download at
                6 AM
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-refresh"
                checked={autoRefresh}
                disabled={view !== LIVE}
                onCheckedChange={(v) => setAutoRefresh(v === true)}
              />
              <Label
                htmlFor="auto-refresh"
                className="cursor-pointer font-normal"
              >
                Auto Refresh (5 min)
              </Label>
            </div>
          </div>
        </div>
      </Card>

      {current.error && !current.data ? (
        <ErrorState message={current.error} onRetry={refresh} />
      ) : (
        <Card className="overflow-hidden">
          {current.error && (
            <p className="border-b bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              Last refresh failed ({current.error}). Showing the previous data.
            </p>
          )}
          <div className="max-h-[70vh] overflow-auto">
            <table
              className="w-max min-w-full border-collapse text-xs"
              aria-label="Morning report"
            >
              <thead className="sticky top-0 z-20 bg-muted">
                <tr>
                  {table.getFlatHeaders().map((h) => {
                    const s = h.column.getIsSorted();
                    const Icon =
                      s === "asc"
                        ? ArrowUp
                        : s === "desc"
                          ? ArrowDown
                          : ArrowUpDown;
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={
                          s === "asc"
                            ? "ascending"
                            : s === "desc"
                              ? "descending"
                              : "none"
                        }
                        className={cn(
                          "border border-border px-1.5 py-1 text-center align-bottom font-semibold",
                          h.id === "well" && "sticky left-0 z-30 bg-muted",
                        )}
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex max-w-[6.5rem] items-end gap-0.5 whitespace-normal leading-tight"
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          <Icon
                            className="mb-0.5 h-3 w-3 shrink-0 opacity-50"
                            aria-hidden
                          />
                        </button>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {table.getFlatHeaders().map((h) => (
                    <th
                      key={h.id}
                      className={cn(
                        "border border-border bg-yellow-50 p-0 font-normal dark:bg-yellow-950/30",
                        h.id === "well" && "sticky left-0 z-30",
                      )}
                    >
                      {h.column.getCanFilter() && (
                        <input
                          value={(h.column.getFilterValue() as string) ?? ""}
                          onChange={(e) =>
                            h.column.setFilterValue(e.target.value || undefined)
                          }
                          placeholder="Click here to filter"
                          aria-label={`Filter ${String(h.column.columnDef.header)}`}
                          className="w-full min-w-[6rem] bg-transparent px-1.5 py-1 text-xs outline-none placeholder:text-muted-foreground focus:bg-accent"
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.isLoading && !current.data ? (
                  Array.from({ length: 12 }, (_, i) => (
                    <tr key={i}>
                      <td
                        colSpan={columns.length}
                        className="border border-border p-1.5"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="border border-border py-10 text-center text-muted-foreground"
                    >
                      {allRows.length === 0
                        ? "XSPOC returned no wells for these areas."
                        : "No wells match these filters."}
                    </td>
                  </tr>
                ) : (
                  shown.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-accent/50"
                      data-testid="morning-row"
                    >
                      {MORNING_COLUMNS.map((c) => {
                        const tone = c.tone?.(row.original) ?? null;
                        const value = formatCell(row.original, c);
                        const Cell = c.key === "well" ? "th" : "td";
                        return (
                          <Cell
                            key={c.key}
                            scope={c.key === "well" ? "row" : undefined}
                            title={value.length > 14 ? value : undefined}
                            data-tone={tone ?? undefined}
                            className={cn(
                              "whitespace-nowrap border border-border px-1.5 py-0.5",
                              c.align === "left" ? "text-left" : "text-center",
                              c.kind !== "text" && "font-mono tabular",
                              c.key === "well" &&
                                "sticky left-0 z-10 bg-muted font-medium",
                              (c.key === "runStatus" ||
                                c.key === "alarms" ||
                                c.key === "comms" ||
                                c.key === "hostAlarms") &&
                                "max-w-[9rem] truncate",
                              c.key === "comment" && "max-w-[14rem] truncate",
                              tone && TONE_CLASS[tone],
                            )}
                          >
                            {value}
                          </Cell>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <span data-testid="last-refresh">
              {asOf
                ? view === LIVE
                  ? `Last Refresh: ${timeText(asOf)}`
                  : `6 AM report saved ${new Date(asOf).toLocaleString("en-US")}`
                : "Loading…"}
              {area ? ` · ${area}` : " · All areas"}
              {well ? ` · ${well}` : ""}
            </span>
            <span className="flex items-center gap-3">
              {columnFilters.length > 0 && (
                <button
                  type="button"
                  className="underline"
                  onClick={() => setColumnFilters([])}
                >
                  Clear column filters
                </button>
              )}
              <span data-testid="row-count">{shown.length} Rows</span>
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
