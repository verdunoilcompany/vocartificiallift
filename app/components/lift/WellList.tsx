"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
import { aspmBg } from "@/lib/lift/colors";
import { formatDate } from "@/lib/lift/dates";
import { cn } from "@/lib/utils";
import type { Well } from "@/types/lift";
import { StatTile } from "./StatTile";

interface WellListProps {
  wells: Well[];
  isLoading: boolean;
  filtersActive: boolean;
  selected: Set<string>;
  onToggle: (name: string) => void;
  /** Where the "Analyse Well" link goes. */
  analyseHref: (name: string) => string;
}

/** Well Filtered / Well Selected tiles plus the selectable well list used by Trends and Review. */
export function WellList({
  wells,
  isLoading,
  filtersActive,
  selected,
  onToggle,
  analyseHref,
}: WellListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<Well>[] = [
    {
      accessorKey: "name",
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
          href={analyseHref(row.original.name)}
          onClick={(e) => e.stopPropagation()}
          className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400"
        >
          Link
        </Link>
      ),
    },
    {
      accessorKey: "aspmStartDate",
      header: "ASPM Start Date",
      sortUndefined: "last",
      cell: ({ row }) => {
        const w = row.original;
        return (
          <span
            className="block rounded-sm px-2 py-1 text-center font-mono text-xs text-neutral-900"
            style={{ backgroundColor: aspmBg(w.aspmState) }}
            title={w.aspmState ? `ASPM: ${w.aspmState}` : "ASPM not enabled"}
          >
            {w.aspmStartDate ? (
              formatDate(w.aspmStartDate)
            ) : (
              <span className="text-muted-foreground">–</span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "avgSpm",
      header: "Average SPM",
      cell: ({ getValue }) => (
        <span className="font-mono tabular">{getValue<number>()}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: wells,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (w) => w.name,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="grid content-start gap-4">
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          label="Well Filtered"
          value={filtersActive ? wells.length : "ALL"}
        />
        <StatTile label="Well Selected" value={selected.size} />
      </div>
      <Card className="overflow-hidden">
        <h2 className="px-4 pt-4 text-center text-xl">Well List</h2>
        <p className="px-4 pb-2 text-center text-xs text-muted-foreground">
          Click rows to select wells. Cell color is the current ASPM
          classification.
        </p>
        <div className="max-h-[560px] overflow-y-auto">
          <Table aria-label="Well list">
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
                    return (
                      <TableHead key={h.id} className="text-center">
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 font-semibold text-foreground"
                          >
                            {flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                            <Icon className="h-3 w-3 opacity-60" aria-hidden />
                          </button>
                        ) : (
                          <span className="font-semibold text-foreground">
                            {flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                          </span>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : wells.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No wells match these controls.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSel = selected.has(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSel ? "selected" : undefined}
                      aria-selected={isSel}
                      data-well={row.id}
                      tabIndex={0}
                      onClick={() => onToggle(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggle(row.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isSel && "shadow-[inset_3px_0_0_hsl(var(--primary))]",
                      )}
                    >
                      {row.getVisibleCells().map((c) => (
                        <TableCell key={c.id} className="py-1.5 text-center">
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
    </div>
  );
}

/** Multi-select well selection, optionally seeded from `?well=` in the URL. */
export function useWellSelection(initial: string | null) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial ? [initial] : []),
  );
  const toggle = (name: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const reset = () => setSelected(new Set());
  return { selected, toggle, reset };
}
