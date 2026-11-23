"use client";

import { Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  addDays,
  clampRange,
  dayKey,
  MAX_DAYS_ALL_WELLS,
  type CardRange,
} from "@/lib/dynocard/card-range";

/**
 * From / To date inputs (whole days, no time) for the shared MLDB card range. The calendar
 * only offers days that keep the range within `maxDays` (14 for all wells, 365 for one well),
 * and a typed date that goes past it moves the other end along. A note says the limit.
 */
export function CardRangeFields({
  range,
  onChange,
  maxDays,
  idPrefix,
  className,
}: {
  range: CardRange;
  onChange: (r: CardRange) => void;
  maxDays: number;
  /** Keeps input ids unique when two copies are on one page. */
  idPrefix: string;
  className?: string;
}) {
  const today = dayKey(new Date());
  const toMax = addDays(range.from, maxDays - 1);
  const limits = {
    from: { min: addDays(range.to, -(maxDays - 1)), max: range.to },
    to: { min: range.from, max: toMax < today ? toMax : today },
  };
  const allWells = maxDays <= MAX_DAYS_ALL_WELLS;

  const field = (key: keyof CardRange, label: string) => {
    const id = `${idPrefix}-${key}`;
    return (
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-xs font-semibold">
          {label}
        </Label>
        <Input
          id={id}
          type="date"
          value={range[key]}
          min={limits[key].min}
          max={limits[key].max}
          onChange={(e) => {
            // An emptied input gives "": keep the last valid day instead.
            const v = e.target.value;
            if (v) onChange(clampRange({ ...range, [key]: v }, maxDays, key));
          }}
          className="h-8 min-w-0 text-xs"
          data-testid={`${idPrefix}-${key}`}
        />
      </div>
    );
  };
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-1", className)}>
      {field("from", "From date")}
      {field("to", "To date")}
      <p
        className="col-span-2 flex items-center gap-1 text-[11px] text-muted-foreground"
        data-testid={`${idPrefix}-hint`}
      >
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        {allWells
          ? `All wells: you can select up to ${MAX_DAYS_ALL_WELLS} days.`
          : "Single well: you can select up to 1 year."}
      </p>
    </div>
  );
}
