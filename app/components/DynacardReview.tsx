"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDynacards } from "@/app/hooks/useDynacards";
import { FULL_PUMP } from "@/lib/dynacard/labels";
import { CardTable } from "./CardTable";
import { CardToolbar } from "./CardToolbar";
import { CardViewer } from "./CardViewer";
import { LabelFilterChips, REVIEW_FILTER } from "./LabelFilterChips";
import { LabelGuide } from "./LabelGuide";

export function DynacardReview() {
  const { cards, model, state, error, source, uploading, upload, showSample, retry } = useDynacards();
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Compare choice is remembered per card; switching cards resets it to that card's label.
  const [compare, setCompare] = useState<{ id: string; label: string } | null>(null);
  const [showImportance, setShowImportance] = useState(true);

  const visible = useMemo(
    () =>
      cards.filter((c) =>
        filter === null ? true : filter === REVIEW_FILTER ? Boolean(c.note) : c.label === filter,
      ),
    [cards, filter],
  );
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const compareLabel =
    selected && compare?.id === selected.id
      ? compare.label
      : selected && model?.ref[selected.label]
        ? selected.label
        : FULL_PUMP;

  const status =
    state !== "ready"
      ? ""
      : source.kind === "upload"
        ? `Loaded ${cards.length} cards from ${source.fileName}.`
        : `Showing ${cards.length} sample cards.`;

  const resetView = () => {
    setFilter(null);
    setSelectedId(null);
  };

  return (
    <div className="grid w-full gap-6 px-4 py-6 md:px-6">
      <section className="grid gap-2" aria-labelledby="page-title">
        <span className="eyebrow">Verdun · Rod pump downhole cards</span>
        <h1 id="page-title" className="text-4xl leading-none">
          Dynacard Classifier Review
        </h1>
        <p className="max-w-[72ch] text-muted-foreground">
          Each card is gridded and binned into 50 loads: L0–L24 going up, L25–L49 coming down. Pick a card
          to see its shape next to the typical shape of the label the model chose.
        </p>
        <div className="pt-2">
          <CardToolbar
            uploading={uploading}
            status={status}
            onUpload={async (f) => {
              if (await upload(f)) resetView();
            }}
            onShowSample={async () => {
              await showSample();
              resetView();
            }}
          />
        </div>
      </section>

      {state === "loading" && <LoadingState />}

      {state === "error" && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load the cards</AlertTitle>
          <AlertDescription className="grid gap-3">
            <p>{error}</p>
            <div>
              <Button variant="outline" size="sm" onClick={() => void retry()}>
                <RotateCcw /> Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {state === "ready" && model && (
        <>
          {cards.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <LabelFilterChips
                cards={cards}
                filter={filter}
                onChange={(f) => {
                  setFilter(f);
                  setSelectedId(null);
                }}
              />
              <section
                aria-label="Cards and viewer"
                className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]"
              >
                <Card className="overflow-hidden">
                  <CardTable cards={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
                </Card>
                {selected ? (
                  <CardViewer
                    card={selected}
                    model={model}
                    compareLabel={compareLabel}
                    onCompareChange={(label) => setCompare({ id: selected.id, label })}
                    showImportance={showImportance}
                    onShowImportanceChange={setShowImportance}
                  />
                ) : (
                  <Card className="grid place-items-center p-10 text-muted-foreground">
                    No cards match this filter.
                  </Card>
                )}
              </section>
            </>
          )}
          <LabelGuide model={model} />
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading cards">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="grid max-w-xl justify-items-start gap-2 p-6">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h2 className="text-xl">No cards to show</h2>
      <p className="text-sm text-muted-foreground">
        Load a predictions file with columns L0–L49 and PredictedLabel, or show the sample cards.
      </p>
    </Card>
  );
}
