"use client";

import { useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DynaCard } from "@/types/dynacard";
import { LabelDot } from "./LabelDot";

interface CardTableProps {
  cards: DynaCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const columns: ColumnDef<DynaCard>[] = [
  {
    accessorKey: "row",
    header: "#",
    cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">#{String(getValue())}</span>,
    sortingFn: (a, b) => Number(a.original.row) - Number(b.original.row),
  },
  {
    accessorKey: "node",
    header: "Well",
    cell: ({ row }) => (
      <div className="grid min-w-0 gap-0.5">
        <span className="truncate font-medium">{row.original.node}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LabelDot label={row.original.label} />
          <span className="truncate">{row.original.label}</span>
        </span>
      </div>
    ),
  },
  { accessorKey: "label", header: "Label", enableHiding: true },
  {
    accessorKey: "fill",
    header: "Fill %",
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return <span className="font-mono text-xs tabular">{v == null ? "–" : v.toFixed(1)}</span>;
    },
    sortUndefined: "last",
  },
];

export function CardTable({ cards, selectedId, onSelect }: CardTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const table = useReactTable({
    data: cards,
    columns,
    state: { sorting, globalFilter, columnVisibility: { label: false } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);

  const move = (from: string, delta: number) => {
    const i = ids.indexOf(from);
    const next = ids[Math.min(ids.length - 1, Math.max(0, i + delta))];
    if (!next) return;
    onSelect(next);
    bodyRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(next)}"]`)?.focus();
  };

  return (
    <div className="grid gap-2">
      <div className="relative px-2 pt-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search wells or labels"
          aria-label="Search wells or labels"
          className="pl-8"
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto lg:max-h-[620px]">
        <Table aria-label="Cards" aria-rowcount={rows.length}>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                      className={cn(header.column.id === "row" && "w-14", header.column.id === "fill" && "w-20 text-right")}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Icon className="h-3 w-3 opacity-60" aria-hidden />
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody ref={bodyRef}>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No cards match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const selected = row.id === selectedId;
                return (
                  <TableRow
                    key={row.id}
                    data-row-id={row.id}
                    data-state={selected ? "selected" : undefined}
                    aria-selected={selected}
                    tabIndex={selected || (!selectedId && row.index === 0) ? 0 : -1}
                    onClick={() => onSelect(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        move(row.id, 1);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        move(row.id, -1);
                      } else if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(row.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected && "shadow-[inset_3px_0_0_hsl(var(--stroke-up))]",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn("py-2", cell.column.id === "fill" && "text-right", cell.column.id === "node" && "max-w-0 w-full")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
