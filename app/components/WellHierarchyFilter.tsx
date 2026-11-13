"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ControlSelect } from "@/app/components/lift/Controls";
import {
  AREAS,
  locateWell,
  routesFor,
  wellsFor,
  type HierarchyFilter,
} from "@/lib/dynocard/well-hierarchy";
import {
  cardTimeKey,
  timeSpan,
  type DateRange,
} from "@/lib/dynocard/card-time";
import type { DynoCard } from "@/types/dynocard";

interface WellHierarchyFilterProps {
  cards: DynoCard[];
  value: HierarchyFilter;
  onChange: (f: HierarchyFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  /** Clears every filter in one update. */
  onClear: () => void;
  matching: number;
}

export const EMPTY_DATE_RANGE: DateRange = { from: null, to: null };

export const EMPTY_HIERARCHY: HierarchyFilter = {
  area: null,
  route: null,
  well: null,
};

/** Cascading Area → Route → Well selects for the Dynocard Explorer. */
export function WellHierarchyFilter({
  cards,
  value,
  onChange,
  dateRange,
  onDateRangeChange,
  onClear,
  matching,
}: WellHierarchyFilterProps) {
  const { area, route, well } = value;
  const routes = routesFor(area);
  const wells = wellsFor(area, route);
  const unassigned = cards.filter((c) => !locateWell(c.node)).length;
  const span = timeSpan(cards.map((c) => c.date));
  const undated = cards.filter((c) => !cardTimeKey(c.date)).length;
  const dateActive = Boolean(dateRange.from || dateRange.to);
  const active = area || route || well || dateActive;

  return (
    <Card className="grid gap-3 p-4" aria-label="Card filters">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <ControlSelect
          label="Area"
          value={area}
          options={AREAS}
          onChange={(a) => {
            // Keep the route/well only if they still belong to the new area.
            const keepRoute =
              route && routesFor(a).includes(route) ? route : null;
            const keepWell =
              well && wellsFor(a, keepRoute).includes(well) ? well : null;
            onChange({ area: a, route: keepRoute, well: keepWell });
          }}
        />
        <ControlSelect
          label="Route"
          value={route}
          options={routes}
          onChange={(r) => {
            const keepWell =
              well && wellsFor(area, r).includes(well) ? well : null;
            onChange({ area, route: r, well: keepWell });
          }}
        />
        <ControlSelect
          label="Well"
          value={well}
          options={wells}
          onChange={(w) => onChange({ area, route, well: w })}
        />
        <DateField
          label="From date"
          value={dateRange.from}
          min={span?.min}
          max={dateRange.to ?? span?.max}
          onChange={(from) => onDateRangeChange({ ...dateRange, from })}
        />
        <DateField
          label="To date"
          value={dateRange.to}
          min={dateRange.from ?? span?.min}
          max={span?.max}
          onChange={(to) => onDateRangeChange({ ...dateRange, to })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span data-testid="hierarchy-status">
          {matching} of {cards.length} cards match
          {unassigned > 0 &&
            ` · ${unassigned} card${unassigned === 1 ? " is" : "s are"} from wells not in the area/route list`}
          {span &&
            (span.min === span.max
              ? ` · cards are from ${span.min}`
              : ` · cards run ${span.min} to ${span.max}`)}
          {dateActive &&
            undated > 0 &&
            ` · ${undated} card${undated === 1 ? " has" : "s have"} no date and are hidden by the date filter`}
        </span>
        {active && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X /> Clear filters
          </Button>
        )}
      </div>
    </Card>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string | null;
  min?: string;
  max?: string;
  onChange: (v: string | null) => void;
}) {
  const id = `dt-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="date"
          value={value ?? ""}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 min-w-0 text-xs"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange(null)}
            aria-label={`Clear ${label}`}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
