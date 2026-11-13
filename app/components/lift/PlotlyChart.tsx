"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Config, Data, Layout } from "plotly.js";

import { Skeleton } from "@/components/ui/skeleton";
import { cssColor } from "@/app/hooks/useCssColor";
import { cn } from "@/lib/utils";

type PlotlyModule = typeof import("plotly.js");

interface PlotlyChartProps {
  /** Built at draw time so CSS-variable colors follow the current theme. */
  figure: () => { data: Data[]; layout: Partial<Layout> };
  /** Change this to redraw (e.g. a hash of the inputs). */
  deps: unknown[];
  label: string;
  className?: string;
  testId?: string;
}

/** Shared Plotly wrapper: dynamic import, theme-aware base layout, loading and failure states. */
export function PlotlyChart({
  figure,
  deps,
  label,
  className,
  testId,
}: PlotlyChartProps) {
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
          plotly.current = ((mod as unknown as { default?: PlotlyModule })
            .default ?? mod) as PlotlyModule;
        }
        if (cancelled) return;
        const { data, layout } = figure();
        const fg = cssColor("--foreground");
        const grid = cssColor("--grid");
        const base: Partial<Layout> = {
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: {
            family: "IBM Plex Sans, system-ui, sans-serif",
            color: fg,
            size: 12,
          },
          margin: { l: 56, r: 24, t: 16, b: 48 },
          hoverlabel: { font: { family: "IBM Plex Mono, monospace" } },
          ...layout,
          xaxis: { gridcolor: grid, zerolinecolor: grid, ...layout.xaxis },
          yaxis: { gridcolor: grid, zerolinecolor: grid, ...layout.yaxis },
        };
        const config: Partial<Config> = {
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: [
            "select2d",
            "lasso2d",
            "autoScale2d",
            "toggleSpikelines",
          ],
        };
        await plotly.current.react(node, data, base, config);
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("Plotly failed to render:", err);
        if (!cancelled) setFailed(true);
      }
    };
    const frame = requestAnimationFrame(() => void draw());
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, resolvedTheme]);

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
        aria-label={label}
        className={cn("h-[340px] w-full", className)}
        data-testid={testId}
      />
    </div>
  );
}
