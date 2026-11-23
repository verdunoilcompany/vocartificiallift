"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ControlSelect } from "@/app/components/lift/Controls";
import { CardRangeFields } from "@/app/components/CardRangeFields";
import {
  AREAS,
  routesFor,
  wellsFor,
  type HierarchyFilter,
} from "@/lib/dynocard/well-hierarchy";
import type { CardRange } from "@/lib/dynocard/card-range";

interface WellHierarchyFilterProps {
  value: HierarchyFilter;
  onChange: (f: HierarchyFilter) => void;
  /** Shared MLDB date range: changing it reloads the cards. */
  range: CardRange;
  onRangeChange: (r: CardRange) => void;
  /** Longest range allowed: 14 days for all wells, 365 for one well. */
  maxDays: number;
  /** Clears Area / Route / Well in one update. */
  onClear: () => void;
}

export const EMPTY_HIERARCHY: HierarchyFilter = {
  area: null,
  route: null,
  well: null,
};

/** Cascading Area → Route → Well selects plus the From / To dates, for the Dynocard Explorer. */
export function WellHierarchyFilter({
  value,
  onChange,
  range,
  onRangeChange,
  maxDays,
  onClear,
}: WellHierarchyFilterProps) {
  const { area, route, well } = value;
  const routes = routesFor(area);
  const wells = wellsFor(area, route);
  const active = area || route || well;

  return (
    <Card className="grid gap-3 p-4" aria-label="Card filters">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
        <CardRangeFields
          range={range}
          onChange={onRangeChange}
          maxDays={maxDays}
          idPrefix="explorer-range"
          className="sm:col-span-3 xl:col-span-2"
        />
      </div>
      {active && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X /> Clear filters
          </Button>
        </div>
      )}
    </Card>
  );
}
