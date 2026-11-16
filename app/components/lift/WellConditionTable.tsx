"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
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
  Search,
  TableProperties,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUploadedPredictions } from "@/app/contexts/UploadedPredictionsContext";
import {
  summarizeByWell,
  type WellConditionRow,
} from "@/lib/dynocard/conditions";
import { FULL_PUMP } from "@/lib/dynocard/labels";
import { cn } from "@/lib/utils";
import {
  PUMP_CONDITIONS,
  type DailyRow,
  type PumpCondition,
} from "@/types/lift";

/** Default (non-upload) rows from the dashboard's daily data. */
function fromDailyRows(rows: DailyRow[]): WellConditionRow[] {
  return rows
    .map((r) => ({
      well: r.well,
      totalCards: r.dailyCardCount,
      fullPump: null,
      counts: Object.fromEntries(
        PUMP_CONDITIONS.map((c) => [c, r.conditions[c] ?? 0]),
      ) as Record<PumpCondition, number>,
    }))
    .sort((a, b) => a.well.localeCompare(b.well, undefined, { numeric: true }));
}

const classifierHref = (condition: PumpCondition, well: string) =>
  `/?${new URLSearchParams({ condition, well }).toString()}`;
/** Full Pump isn't one of the 13 conditions, so it links by model label. */
const fullPumpHref = (well: string) =>
  `/?${new URLSearchParams({ label: FULL_PUMP, well }).toString()}`;

/** Only Bad Data is highlighted (red); the other condition columns stay plain. */
const toneClass = (c: PumpCondition) =>
  c === "Bad Data" ? "bg-destructive/10 text-destructive font-semibold" : "";

/**
 * One row per well: total cards and how many cards fall in each pump condition.
 * Same source as the condition tiles: the uploaded predictions file, else the dashboard data.
 */
export function WellConditionTable({
  rows,
  loading,
}: {
  rows: DailyRow[];
  loading: boolean;
}) {
  const { predictions, defaultPredictions, defaultError } =
    useUploadedPredictions();
  const source = predictions ?? defaultPredictions;
  // Links into the Classifier only work when the uploaded cards are loaded there.
  const fromUpload = Boolean(predictions);
  const fromPredictions = Boolean(source);
  const data = useMemo(
    () => (source ? summarizeByWell(source.cards) : fromDailyRows(rows)),
    [source, rows],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<WellConditionRow>[]>(
    () => [
      { id: "well", accessorKey: "well", header: "Well" },
      { id: "totalCards", accessorKey: "totalCards", header: "Total Cards" },
      ...(fromPredictions
        ? [
            {
              id: "fullPump",
              accessorFn: (r: WellConditionRow) => r.fullPump ?? 0,
              header: "Full Pump",
            },
          ]
        : []),
      ...PUMP_CONDITIONS.map((c): ColumnDef<WellConditionRow> => ({
        id: c,
        accessorFn: (r) => r.counts[c],
        header: c,
      })),
    ],
    [fromPredictions],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value: string) =>
      row.original.well.toLowerCase().includes(value.toLowerCase()),
    getRowId: (r) => r.well,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const shown = table.getRowModel().rows;

  // Column totals for the footer.
  const totals = useMemo(() => {
    const t: Record<string, number> = { totalCards: 0, fullPump: 0 };
    for (const c of PUMP_CONDITIONS) t[c] = 0;
    for (const r of shown) {
      t.totalCards += r.original.totalCards;
      t.fullPump += r.original.fullPump ?? 0;
      for (const c of PUMP_CONDITIONS) t[c] += r.original.counts[c];
    }
    return t;
  }, [shown]);

  // Waiting for the default file (or, if it failed, for the dashboard rows).
  const busy = !source && (!defaultError || loading);

  return (
    <section aria-labelledby="well-conditions-title" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2
            id="well-conditions-title"
            className="flex items-center gap-2 text-2xl"
          >
            <TableProperties className="h-5 w-5 text-primary" aria-hidden />
            Pump Conditions by Well
          </h2>
          <p className="text-sm text-muted-foreground">
            Cards per condition for each well ·{" "}
            {predictions ? (
              <>
                from{" "}
                <span className="font-medium text-foreground">
                  {predictions.fileName}
                </span>{" "}
                · click a number to open those cards in the Dynocard Classifier
              </>
            ) : defaultPredictions ? (
              <>
                default data:{" "}
                <span className="font-medium text-foreground">
                  {defaultPredictions.fileName}
                </span>{" "}
                · upload predictions on the Dynocard Classifier or Explorer to
                use your own file
              </>
            ) : (
              "dashboard data (the default predictions file could not be loaded)"
            )}
          </p>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wells"
            aria-label="Search wells"
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[640px] overflow-auto">
          <table
            className="w-max min-w-full border-collapse text-xs"
            aria-label="Pump conditions by well"
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
                        h.id === "well" &&
                          "sticky left-0 z-30 bg-muted text-left",
                      )}
                    >
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="inline-flex max-w-[6.5rem] items-end gap-0.5 whitespace-normal leading-tight"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <Icon
                          className="mb-0.5 h-3 w-3 shrink-0 opacity-50"
                          aria-hidden
                        />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {busy ? (
                Array.from({ length: 8 }, (_, i) => (
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
                    {data.length === 0
                      ? "No wells to summarize."
                      : "No wells match this search."}
                  </td>
                </tr>
              ) : (
                shown.map((row) => {
                  const r = row.original;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-accent/50"
                      data-testid="well-condition-row"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap border border-border bg-muted px-2 py-1 text-left font-medium"
                      >
                        {r.well}
                      </th>
                      <td className="border border-border px-2 py-1 text-center font-mono font-semibold tabular">
                        {r.totalCards}
                      </td>
                      {fromPredictions && (
                        <td
                          className={cn(
                            "border border-border px-2 py-1 text-center font-mono tabular",
                            r.fullPump && "bg-good-bg font-semibold text-good",
                          )}
                        >
                          {r.fullPump && !fromUpload ? (
                            r.fullPump
                          ) : r.fullPump ? (
                            <Link
                              href={fullPumpHref(r.well)}
                              className="block underline-offset-2 hover:underline"
                              title={`Open ${r.well}'s Full Pump cards in the Dynocard Classifier`}
                            >
                              {r.fullPump}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      )}
                      {PUMP_CONDITIONS.map((c) => {
                        const n = r.counts[c];
                        return (
                          <td
                            key={c}
                            className={cn(
                              "border border-border p-0 text-center font-mono tabular",
                              n > 0 && toneClass(c),
                            )}
                          >
                            {n === 0 ? (
                              <span className="block px-2 py-1 text-muted-foreground">
                                –
                              </span>
                            ) : fromUpload ? (
                              <Link
                                href={classifierHref(c, r.well)}
                                className="block px-2 py-1 underline-offset-2 hover:underline"
                                title={`Open ${r.well}'s ${c} cards in the Dynocard Classifier`}
                              >
                                {n}
                              </Link>
                            ) : (
                              <span className="block px-2 py-1">{n}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
            {!busy && shown.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-muted font-semibold">
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-30 border border-border bg-muted px-2 py-1 text-left"
                  >
                    Total ({shown.length} wells)
                  </th>
                  <td className="border border-border px-2 py-1 text-center font-mono tabular">
                    {totals.totalCards}
                  </td>
                  {fromPredictions && (
                    <td className="border border-border px-2 py-1 text-center font-mono tabular">
                      {totals.fullPump}
                    </td>
                  )}
                  {PUMP_CONDITIONS.map((c) => (
                    <td
                      key={c}
                      className="border border-border px-2 py-1 text-center font-mono tabular"
                    >
                      {totals[c]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </section>
  );
}
