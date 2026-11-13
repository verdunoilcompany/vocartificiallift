"use client";

import { useId } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LABELS, isFullPump } from "@/lib/dynocard/labels";
import type { DynoCard, ModelReference } from "@/types/dynocard";
import { DynocardPlot } from "./DynocardPlot";

interface CardViewerProps {
  card: DynoCard;
  model: ModelReference;
  compareLabel: string;
  onCompareChange: (label: string) => void;
  showImportance: boolean;
  onShowImportanceChange: (show: boolean) => void;
  /** When set, shows a close (×) button in the top-right corner (Dynocard Explorer). */
  onClose?: () => void;
}

export function CardViewer({
  card,
  model,
  compareLabel,
  onCompareChange,
  showImportance,
  onShowImportanceChange,
  onClose,
}: CardViewerProps) {
  // Unique ids so several viewers can share one page (Dynocard Explorer).
  const uid = useId();
  const titleId = `${uid}-title`;
  const compareId = `${uid}-compare`;
  const importanceId = `${uid}-importance`;
  const full = isFullPump(card.label);

  return (
    <Card className="relative min-w-0" aria-labelledby={titleId}>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label={`Close ${card.node}`}
          title="Close this card"
        >
          <X />
        </Button>
      )}
      <CardHeader
        className={cn(
          "flex flex-row flex-wrap items-end justify-between gap-3 space-y-0 pb-3",
          onClose && "pr-12",
        )}
      >
        <div className="grid min-w-0 gap-1.5">
          <span className="eyebrow">
            Row {String(card.row)}
            {card.date ? ` · ${card.date}` : ""}
          </span>
          <h2 id={titleId} className="truncate text-2xl leading-tight">
            {card.node}
          </h2>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>SPM</dt>
              <dd className="font-mono text-foreground tabular">
                {card.spm ?? "–"}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Fillage</dt>
              <dd className="font-mono text-foreground tabular">
                {card.fill != null ? `${card.fill}%` : "–"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "font-display text-base font-semibold tracking-wide",
              full && "bg-good-bg text-good hover:bg-good-bg",
            )}
            data-testid="predicted-label"
          >
            {card.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Label htmlFor={compareId}>Compare with</Label>
            <Select value={compareLabel} onValueChange={onCompareChange}>
              <SelectTrigger id={compareId} className="h-8 w-[210px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={importanceId}
              checked={showImportance}
              onCheckedChange={(v) => onShowImportanceChange(v === true)}
            />
            <Label
              htmlFor={importanceId}
              className="cursor-pointer font-normal"
            >
              Show where the model looks
            </Label>
          </div>
        </div>

        <DynocardPlot
          card={card}
          compareLabel={compareLabel}
          referenceShape={model.ref[compareLabel]}
          importance={model.imp}
          showImportance={showImportance}
        />

        <ul
          className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
          aria-label="Chart legend"
        >
          <li className="flex items-center gap-1.5">
            <i
              className="inline-block h-[3px] w-4 rounded bg-stroke-up"
              aria-hidden
            />{" "}
            Upstroke L0–L24
          </li>
          <li className="flex items-center gap-1.5">
            <i
              className="inline-block h-[3px] w-4 rounded bg-stroke-down"
              aria-hidden
            />{" "}
            Downstroke L25–L49
          </li>
          <li className="flex items-center gap-1.5">
            <i
              className="inline-block w-4 border-t-2 border-dashed border-stroke-ref"
              aria-hidden
            />{" "}
            Typical shape of compared label
          </li>
          {showImportance && (
            <li className="flex items-center gap-1.5">
              <i
                className="inline-block h-2.5 w-2.5 rounded-full bg-stroke-down/35"
                aria-hidden
              />{" "}
              Bins the model relies on most
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
