"use client";

import { useMemo } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DynaCard } from "@/types/dynacard";
import { LabelDot } from "./LabelDot";

export const REVIEW_FILTER = "__review";

interface LabelFilterChipsProps {
  cards: DynaCard[];
  filter: string | null;
  onChange: (filter: string | null) => void;
}

export function LabelFilterChips({ cards, filter, onChange }: LabelFilterChipsProps) {
  const { counts, flagged } = useMemo(() => {
    const c = new Map<string, number>();
    cards.forEach((card) => c.set(card.label, (c.get(card.label) ?? 0) + 1));
    return {
      counts: [...c.entries()].sort((a, b) => b[1] - a[1]),
      flagged: cards.filter((card) => card.note).length,
    };
  }, [cards]);

  const chip = (active: boolean, extra?: string | false) =>
    cn(
      "h-8 rounded-full px-3",
      active && "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
      extra,
    );

  return (
    <div role="group" aria-label="Filter by predicted label" className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={filter === null}
        className={chip(filter === null)}
        onClick={() => onChange(null)}
      >
        All <span className="font-mono opacity-70">{cards.length}</span>
      </Button>
      {counts.map(([label, n]) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          aria-pressed={filter === label}
          className={chip(filter === label)}
          onClick={() => onChange(label)}
        >
          <LabelDot label={label} />
          {label} <span className="font-mono opacity-70">{n}</span>
        </Button>
      ))}
      {flagged > 0 && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={filter === REVIEW_FILTER}
          className={chip(filter === REVIEW_FILTER, filter !== REVIEW_FILTER && "border-warn text-warn")}
          onClick={() => onChange(REVIEW_FILTER)}
        >
          <Flag /> Needs review <span className="font-mono opacity-70">{flagged}</span>
        </Button>
      )}
    </div>
  );
}
