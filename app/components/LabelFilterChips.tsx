"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DynoCard } from "@/types/dynocard";
import { LabelDot } from "./LabelDot";

interface LabelFilterChipsProps {
  cards: DynoCard[];
  filter: string | null;
  onChange: (filter: string | null) => void;
}

export function LabelFilterChips({ cards, filter, onChange }: LabelFilterChipsProps) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    cards.forEach((card) => c.set(card.label, (c.get(card.label) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  const chip = (active: boolean) =>
    cn(
      "h-8 rounded-full px-3",
      active && "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
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
    </div>
  );
}
