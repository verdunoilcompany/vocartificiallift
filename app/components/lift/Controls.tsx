"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Well } from "@/types/lift";

const ALL = "__all";

export type WellFilterKey =
  | "level1"
  | "level2"
  | "level3"
  | "pumpingUnit"
  | "optimizationMode"
  | "automationStatus"
  | "aspmState";

export const FILTER_LABELS: Record<WellFilterKey, string> = {
  level1: "Hierarchy Level 1",
  level2: "Hierarchy Level 2",
  level3: "Hierarchy Level 3",
  pumpingUnit: "Pumping Unit",
  optimizationMode: "Optimization Mode",
  automationStatus: "Automation Status",
  aspmState: "ASPM State",
};

export type WellFilters = Partial<Record<WellFilterKey, string>>;

const valueOf = (w: Well, k: WellFilterKey) =>
  k === "aspmState" ? (w.aspmState ?? "None") : w[k];

/** Hierarchy/attribute filters shared by every dashboard. */
export function useWellFilters(wells: Well[]) {
  const [filters, setFilters] = useState<WellFilters>({});
  const filtered = useMemo(
    () =>
      wells.filter((w) =>
        (Object.keys(filters) as WellFilterKey[]).every(
          (k) => !filters[k] || valueOf(w, k) === filters[k],
        ),
      ),
    [wells, filters],
  );
  const options = (k: WellFilterKey) =>
    [...new Set(wells.map((w) => valueOf(w, k)))].sort();
  const setFilter = (k: WellFilterKey, v: string | null) =>
    setFilters((f) => {
      const next = { ...f };
      if (v) next[k] = v;
      else delete next[k];
      return next;
    });
  const active = Object.keys(filters).length > 0;
  return { filters, filtered, options, setFilter, active };
}

export function ControlSelect({
  label,
  value,
  options,
  onChange,
  allowAll = true,
}: {
  label: string;
  value: string | null | undefined;
  options: { value: string; label: string }[] | string[];
  onChange: (v: string | null) => void;
  allowAll?: boolean;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const id = `ctl-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? null : v)}
      >
        <SelectTrigger id={id} className="h-8 w-full min-w-[9rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value={ALL}>All</SelectItem>}
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ControlDate({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const id = `ctl-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-8 min-w-[9rem] text-xs"
      />
    </div>
  );
}

/** Imperial is the only unit system (org default), shown for parity with the source dashboards. */
export function UnitControl() {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold">Unit</span>
      <span className="flex h-8 items-center rounded-md border bg-muted px-3 text-xs text-muted-foreground">
        Imperial
      </span>
    </div>
  );
}

/** Collapsible "Controls" strip that sits under the page title. */
export function ControlsBar({
  children,
  filterKeys,
  wellFilters,
}: {
  children?: ReactNode;
  filterKeys: WellFilterKey[];
  wellFilters: ReturnType<typeof useWellFilters>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Controls" className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          Controls
          {!open && (
            <span className="text-xs font-normal text-muted-foreground">
              {wellFilters.active
                ? Object.entries(wellFilters.filters)
                    .map(
                      ([k, v]) => `${FILTER_LABELS[k as WellFilterKey]}: ${v}`,
                    )
                    .join(" · ")
                : "All wells"}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t px-4 py-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {children}
          {filterKeys.map((k) => (
            <ControlSelect
              key={k}
              label={FILTER_LABELS[k]}
              value={wellFilters.filters[k]}
              options={wellFilters.options(k)}
              onChange={(v) => wellFilters.setFilter(k, v)}
            />
          ))}
          <UnitControl />
        </div>
      )}
    </section>
  );
}
