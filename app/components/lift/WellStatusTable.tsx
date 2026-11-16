"use client";

import { useEffect, useMemo, useState } from "react";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Database,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/app/hooks/useApi";
import { cn } from "@/lib/utils";
import type { WellStatusResponse, WellStatusRow } from "@/types/xspoc";
import { ErrorState } from "./StatusStates";

const REFRESH_MS = 5 * 60_000;

/** Red for shutdowns, yellow for anything else that isn't running, plain when running. */
export function runStatusTone(
  status: string | null,
): "shutdown" | "idle" | "running" {
  const s = (status ?? "").trim().toLowerCase();
  if (s.startsWith("running")) return "running";
  if (s.startsWith("shutdown")) return "shutdown";
  return "idle";
}

/** "2026-11-16 06:29:34" → "11/16/26 06:29:34" (as XSPOC shows it). */
function scanText(v: string | null): string {
  if (!v) return "";
  const [d, t] = v.split(" ");
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y.slice(2)} ${t ?? ""}`.trim();
}

const pct = (v: number | null) => (v === null ? "" : String(Math.round(v)));

const columns: ColumnDef<WellStatusRow>[] = [
  { accessorKey: "well", header: "Well", filterFn: "includesString" },
  {
    accessorKey: "lastGoodScan",
    header: "Last Good Scan",
    cell: ({ getValue }) => scanText(getValue<string | null>()),
    filterFn: (row, id, value: string) =>
      scanText(row.getValue<string | null>(id)).includes(value),
    sortUndefined: "last",
  },
  {
    accessorKey: "runStatus",
    header: "Run Status",
    filterFn: "includesString",
  },
  {
    accessorKey: "runTime",
    header: "Run time",
    cell: ({ getValue }) => pct(getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "runTimeYesterday",
    header: "% RTY",
    cell: ({ getValue }) => pct(getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "idleTime",
    header: "Idle Time min",
    cell: ({ getValue }) => pct(getValue<number | null>()),
    enableColumnFilter: false,
  },
];

/** Live XSPOC well run status, laid out like the XSPOC well grid. */
export function WellStatusTable() {
  const api = useApi<WellStatusResponse>("/api/xspoc/well-status");
  const { retry } = api;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Keep the grid current without a page reload.
  useEffect(() => {
    const t = setInterval(retry, REFRESH_MS);
    return () => clearInterval(t);
  }, [retry]);

  const rows = useMemo(() => api.data?.rows ?? [], [api.data]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowId: (r) => r.well,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const shown = table.getRowModel().rows;
  const counts = useMemo(() => {
    const c = { running: 0, idle: 0, shutdown: 0 };
    for (const r of rows) c[runStatusTone(r.runStatus)] += 1;
    return c;
  }, [rows]);

  const fetched = api.data
    ? new Date(api.data.fetchedAt).toLocaleTimeString("en-US")
    : null;

  return (
    <section aria-labelledby="well-status-title" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2
            id="well-status-title"
            className="flex items-center gap-2 text-2xl"
          >
            <Database className="h-5 w-5 text-primary" aria-hidden />
            Well Run Status
          </h2>
          <p className="text-sm text-muted-foreground">
            Live from XSPOC · {rows.length} enabled wells
            {rows.length > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-foreground">
                  {counts.running} running
                </span>{" "}
                · <span className="text-foreground">{counts.idle} idle</span> ·{" "}
                <span className="text-foreground">
                  {counts.shutdown} shut down
                </span>
              </>
            )}
            {fetched && ` · updated ${fetched}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          disabled={api.isLoading}
        >
          <RefreshCw className={cn(api.isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {api.error && !api.data ? (
        <ErrorState message={api.error} onRetry={retry} />
      ) : (
        <Card className="overflow-hidden">
          {api.error && (
            <p className="border-b bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              Last refresh failed ({api.error}). Showing the previous data.
            </p>
          )}
          <div className="max-h-[640px] overflow-auto">
            <table
              className="w-full border-collapse text-sm"
              aria-label="XSPOC well run status"
            >
              <thead className="sticky top-0 z-10 bg-muted">
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
                        className="border border-border px-2 py-1.5 text-center align-bottom font-semibold"
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 leading-tight"
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          <Icon
                            className="h-3 w-3 shrink-0 opacity-50"
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
                      className="border border-border bg-card p-0 font-normal"
                    >
                      {h.column.getCanFilter() ? (
                        <input
                          value={(h.column.getFilterValue() as string) ?? ""}
                          onChange={(e) =>
                            h.column.setFilterValue(e.target.value || undefined)
                          }
                          placeholder="Click here to filter"
                          aria-label={`Filter ${String(h.column.columnDef.header)}`}
                          className="w-full min-w-[7rem] bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:bg-accent"
                        />
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {api.isLoading && !api.data ? (
                  Array.from({ length: 10 }, (_, i) => (
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
                      className="border border-border py-8 text-center text-muted-foreground"
                    >
                      {rows.length === 0
                        ? "XSPOC returned no enabled wells."
                        : "No wells match these filters."}
                    </td>
                  </tr>
                ) : (
                  shown.map((row) => {
                    const r = row.original;
                    const tone = runStatusTone(r.runStatus);
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-accent/50"
                        data-testid="well-status-row"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap border border-border bg-muted/60 px-2 py-1 text-left font-medium"
                        >
                          {r.well}
                        </th>
                        <td className="whitespace-nowrap border border-border px-2 py-1 font-mono text-xs tabular">
                          {scanText(r.lastGoodScan)}
                        </td>
                        <td
                          data-tone={tone}
                          title={r.runStatus ?? ""}
                          className={cn(
                            "max-w-[16rem] truncate border border-border px-2 py-1 text-center",
                            tone === "shutdown" &&
                              "bg-red-600 font-medium text-white",
                            tone === "idle" && "bg-yellow-300 text-neutral-900",
                          )}
                        >
                          {r.runStatus ?? ""}
                        </td>
                        <td className="border border-border px-2 py-1 text-center font-mono tabular">
                          {pct(r.runTime)}
                        </td>
                        <td className="border border-border px-2 py-1 text-center font-mono tabular">
                          {pct(r.runTimeYesterday)}
                        </td>
                        <td className="border border-border px-2 py-1 text-center font-mono tabular">
                          {pct(r.idleTime)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {columnFilters.length > 0 && (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Showing {shown.length} of {rows.length} wells.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setColumnFilters([])}
              >
                Clear filters
              </button>
            </p>
          )}
        </Card>
      )}
    </section>
  );
}
