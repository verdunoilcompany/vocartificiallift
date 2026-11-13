"use client";

import { useEffect, useMemo, useState } from "react";

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
import { useApi } from "@/app/hooks/useApi";
import { addDays, formatDateTime } from "@/lib/lift/dates";
import { cn } from "@/lib/utils";
import type { SetpointChange, WellsResponse } from "@/types/lift";
import {
  ControlDate,
  ControlSelect,
  ControlsBar,
  useWellFilters,
} from "./Controls";
import { PageTitle } from "./PageTitle";
import { EmptyState, ErrorState } from "./StatusStates";

/** Columns that merge into one cell when consecutive rows share the same value (and every column to their left). */
const GROUPED = [
  "level1",
  "level2",
  "level3",
  "well",
  "at",
  "initiator",
] as const;
type GroupKey = (typeof GROUPED)[number];

const HEADERS: { label: string; className?: string }[] = [
  { label: "Hierarchy Level 1" },
  { label: "Hierarchy Level 2" },
  { label: "Hierarchy Level 3" },
  { label: "Well Name" },
  { label: "Date" },
  { label: "Initiator" },
  { label: "Setpoint Change" },
  { label: "Idle Time" },
  { label: "Min" },
  { label: "Max" },
  { label: "Old Idle Time", className: "bg-muted/60" },
  { label: "Old Min", className: "bg-muted/60" },
  { label: "Old Max", className: "bg-muted/60" },
];

export function SetpointReport() {
  const wellsApi = useApi<WellsResponse>("/api/lift/wells");
  const wells = useMemo(() => wellsApi.data?.wells ?? [], [wellsApi.data]);
  const filters = useWellFilters(wells);
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [kind, setKind] = useState<string | null>(null);
  const [initiator, setInitiator] = useState<string | null>(null);

  useEffect(() => {
    const latest = wellsApi.data?.latestDate;
    if (latest && !range) setRange({ start: addDays(latest, -7), end: latest });
  }, [wellsApi.data, range]);

  const api = useApi<{ changes: SetpointChange[] }>(
    range ? `/api/lift/setpoints?start=${range.start}&end=${range.end}` : null,
  );

  const names = useMemo(
    () => new Set(filters.filtered.map((w) => w.name)),
    [filters.filtered],
  );
  const changes = useMemo(
    () =>
      (api.data?.changes ?? []).filter(
        (c) =>
          names.has(c.well) &&
          (!kind || c.kind === kind) &&
          (!initiator || c.initiator === initiator),
      ),
    [api.data, names, kind, initiator],
  );
  const spans = useMemo(() => rowSpans(changes), [changes]);
  const loading = wellsApi.isLoading || api.isLoading || !range;
  const error = wellsApi.error ?? api.error;

  return (
    <div className="grid w-full gap-5 px-4 py-6 md:px-6">
      <PageTitle
        title="Setpoint Report"
        description="Every SPM and idle-time setpoint change in the date range, with the values it replaced."
      />

      <ControlsBar
        wellFilters={filters}
        filterKeys={[
          "level1",
          "level2",
          "level3",
          "pumpingUnit",
          "optimizationMode",
          "aspmState",
        ]}
      >
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
        <ControlSelect
          label="Setpoint Change"
          value={kind}
          options={["SPM", "Idle Time (min)"]}
          onChange={setKind}
        />
        <ControlSelect
          label="Initiator"
          value={initiator}
          options={["Field Change", "Auto Accepted"]}
          onChange={setInitiator}
        />
      </ControlsBar>

      {error ? (
        <ErrorState
          message={error}
          onRetry={wellsApi.error ? wellsApi.retry : api.retry}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <Table aria-label="Setpoint changes" className="border-collapse">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  {HEADERS.map((h) => (
                    <TableHead
                      key={h.label}
                      className={cn(
                        "whitespace-nowrap text-center font-semibold text-foreground",
                        h.className,
                      )}
                    >
                      {h.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={HEADERS.length}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : changes.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={HEADERS.length}>
                      <EmptyState
                        title="No setpoint changes"
                        detail="Nothing changed in this date range for these wells."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  changes.map((c, i) => (
                    <TableRow
                      key={c.id}
                      className="hover:bg-transparent"
                      data-testid="setpoint-row"
                    >
                      {GROUPED.map((k) =>
                        spans[i][k] === 0 ? null : (
                          <TableCell
                            key={k}
                            rowSpan={spans[i][k]}
                            className={cn(
                              "border-x text-center align-top",
                              k === "well" || k === "at" || k === "initiator"
                                ? "font-semibold"
                                : "italic text-muted-foreground",
                              k === "at" && "whitespace-nowrap",
                            )}
                          >
                            {k === "at" ? formatDateTime(c.at) : c[k]}
                          </TableCell>
                        ),
                      )}
                      <TableCell className="border-x text-center font-semibold">
                        {c.kind}
                      </TableCell>
                      <NumCell v={c.idleTime} bold />
                      <NumCell v={c.min} bold />
                      <NumCell v={c.max} bold />
                      <NumCell v={c.oldIdleTime} />
                      <NumCell v={c.oldMin} />
                      <NumCell v={c.oldMax} />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && changes.length > 0 && (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              {changes.length} change{changes.length === 1 ? "" : "s"} across{" "}
              {new Set(changes.map((c) => c.well)).size} wells.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function NumCell({ v, bold }: { v: number | null; bold?: boolean }) {
  return (
    <TableCell
      className={cn(
        "border-x text-center font-mono tabular",
        bold && "font-semibold",
      )}
    >
      {v ?? ""}
    </TableCell>
  );
}

/** rowSpan per grouped column per row; 0 means the cell is covered by a span above it. */
function rowSpans(rows: SetpointChange[]): Record<GroupKey, number>[] {
  const out = rows.map(
    () =>
      Object.fromEntries(GROUPED.map((k) => [k, 1])) as Record<
        GroupKey,
        number
      >,
  );
  GROUPED.forEach((k, col) => {
    let anchor = 0;
    for (let i = 1; i < rows.length; i++) {
      const same = GROUPED.slice(0, col + 1).every(
        (g) => rows[i][g] === rows[i - 1][g],
      );
      if (same) {
        out[anchor][k] += 1;
        out[i][k] = 0;
      } else {
        anchor = i;
      }
    }
  });
  return out;
}
