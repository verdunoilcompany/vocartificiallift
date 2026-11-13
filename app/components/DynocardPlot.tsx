"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Annotations, Config, Data, Layout } from "plotly.js";

import { Skeleton } from "@/components/ui/skeleton";
import { cssColor } from "@/app/hooks/useCssColor";
import { BIN_POSITIONS, closedLoop } from "@/lib/dynocard/geometry";
import { UPSTROKE_BINS, type DynoCard } from "@/types/dynocard";

type PlotlyModule = typeof import("plotly.js");

/** Bins whose importance exceeds this are highlighted as "where the model looks". */
const HOT_THRESHOLD = 0.55;

interface DynocardPlotProps {
  card: DynoCard;
  compareLabel: string;
  referenceShape?: number[];
  importance: number[];
  showImportance: boolean;
}

export function DynocardPlot({
  card,
  compareLabel,
  referenceShape,
  importance,
  showImportance,
}: DynocardPlotProps) {
  const el = useRef<HTMLDivElement>(null);
  const plotly = useRef<PlotlyModule | null>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const node = el.current;
    if (!node) return;

    const draw = async () => {
      try {
        if (!plotly.current) {
          const mod = await import("plotly.js-dist");
          plotly.current = ((mod as unknown as { default?: PlotlyModule }).default ?? mod) as PlotlyModule;
        }
        if (cancelled) return;
        const { data, layout } = buildFigure(card, compareLabel, referenceShape, importance, showImportance);
        const config: Partial<Config> = {
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines"],
        };
        await plotly.current.react(node, data, layout, config);
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("Plotly failed to render:", err);
        if (!cancelled) setFailed(true);
      }
    };

    // Let next-themes apply the theme class before reading CSS variables.
    const frame = requestAnimationFrame(() => void draw());
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [card, compareLabel, referenceShape, importance, showImportance, resolvedTheme]);

  useEffect(() => {
    const node = el.current;
    return () => {
      if (node && plotly.current) plotly.current.purge(node);
    };
  }, []);

  if (failed) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        The chart could not be drawn in this browser.
      </p>
    );
  }

  return (
    <div className="relative w-full">
      {!ready && <Skeleton className="absolute inset-0" />}
      <div
        ref={el}
        role="img"
        aria-label={`Dynocard for ${card.node}, predicted ${card.label}, compared with the typical ${compareLabel} shape`}
        className="h-[340px] w-full sm:h-[420px]"
        data-testid="dynocard-plot"
      />
    </div>
  );
}

function buildFigure(
  card: DynoCard,
  compareLabel: string,
  referenceShape: number[] | undefined,
  importance: number[],
  showImportance: boolean,
): { data: Data[]; layout: Partial<Layout> } {
  const up = cssColor("--stroke-up");
  const down = cssColor("--stroke-down");
  const ref = cssColor("--stroke-ref");
  const muted = cssColor("--muted-foreground");
  const grid = cssColor("--grid");
  const border = cssColor("--border");
  const card_ = cssColor("--card");
  const fg = cssColor("--foreground");

  const L = card.L;
  const data: Data[] = [];

  if (referenceShape) {
    const loop = closedLoop(referenceShape);
    data.push({
      type: "scatter",
      mode: "lines",
      name: `Typical ${compareLabel}`,
      x: loop.map((p) => p[0]),
      y: loop.map((p) => p[1]),
      fill: "toself",
      fillcolor: cssColor("--stroke-ref", 0.08),
      line: { color: ref, width: 2, dash: "dash" },
      hoverinfo: "skip",
    });
  }

  if (showImportance) {
    const hot = L.map((v, i) => ({ i, v, w: importance[i] ?? 0 })).filter((p) => p.w > HOT_THRESHOLD);
    data.push({
      type: "scatter",
      mode: "markers",
      name: "Bins the model relies on most",
      x: hot.map((p) => BIN_POSITIONS[p.i]),
      y: hot.map((p) => p.v),
      marker: {
        size: hot.map((p) => (8 + 12 * p.w) * 1.7),
        color: hot.map((p) => cssColor("--stroke-down", 0.15 + 0.2 * p.w)),
        line: { width: 0 },
      },
      text: hot.map((p) => `L${p.i} importance ${p.w.toFixed(2)}`),
      hovertemplate: "%{text}<extra></extra>",
    });
  }

  const upIdx = Array.from({ length: UPSTROKE_BINS }, (_, i) => i);
  // Downstroke runs L24 → L49 and closes back to L0 so the loop is continuous.
  const downIdx = [...Array.from({ length: L.length - UPSTROKE_BINS + 1 }, (_, i) => i + UPSTROKE_BINS - 1), 0];

  const strokeTrace = (idx: number[], color: string, name: string, markerIdx: number[]): Data => ({
    type: "scatter",
    mode: "lines+markers",
    name,
    x: idx.map((i) => BIN_POSITIONS[i]),
    y: idx.map((i) => L[i]),
    line: { color, width: 2.6, shape: "linear" },
    marker: {
      color,
      size: idx.map((i, k) => (markerIdx.includes(i) && !(k === idx.length - 1 && i === 0) ? 6 : 0.1)),
    },
    text: idx.map((i) => `L${i}`),
    hovertemplate: "%{text}: %{y:.3f}<br>Position %{x:.2f}<extra></extra>",
  });

  data.push(strokeTrace(upIdx, up, "Upstroke L0–L24", upIdx));
  data.push(
    strokeTrace(
      downIdx,
      down,
      "Downstroke L25–L49",
      Array.from({ length: L.length - UPSTROKE_BINS }, (_, i) => i + UPSTROKE_BINS),
    ),
  );

  const tag = (i: number, color: string, xshift: number, yshift: number, xanchor: "left" | "right"): Partial<Annotations> => ({
    x: BIN_POSITIONS[i],
    y: L[i],
    text: `L${i}`,
    showarrow: false,
    xshift,
    yshift,
    xanchor,
    font: { family: "var(--font-mono), monospace", size: 11, color },
  });

  const axis = (title: string) => ({
    title: { text: title, font: { size: 12, color: muted } },
    range: [-0.02, 1.04],
    dtick: 0.2,
    gridcolor: grid,
    zeroline: false,
    linecolor: border,
    tickfont: { family: "var(--font-mono), monospace", size: 11, color: muted },
    fixedrange: false,
  });

  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 56, r: 16, t: 12, b: 48 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "var(--font-sans), sans-serif", color: muted },
    showlegend: false,
    hovermode: "closest",
    hoverlabel: { bgcolor: card_, bordercolor: border, font: { color: fg } },
    xaxis: axis("Position (0 = bottom of stroke, 1 = top)"),
    yaxis: axis("Load (scaled 0–1)"),
    annotations: [
      tag(0, up, -6, -12, "right"),
      tag(24, up, -6, 12, "right"),
      tag(25, down, 6, -12, "left"),
      tag(49, down, 6, 10, "left"),
    ],
  };

  return { data, layout };
}
