import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { closedLoop } from "@/lib/dynacard/geometry";
import { LABELS, LABEL_DESCRIPTIONS } from "@/lib/dynacard/labels";
import type { ModelReference } from "@/types/dynacard";

function Shape({ loads }: { loads: number[] }) {
  const x = (v: number) => 8 + v * 164;
  const y = (v: number) => 92 - v * 84;
  const points = closedLoop(loads)
    .map(([px, py]) => `${x(px).toFixed(1)},${y(py).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 180 100" className="h-auto w-full" aria-hidden>
      <polygon
        points={points}
        className="fill-stroke-up/10 stroke-stroke-up"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LabelGuide({ model }: { model: ModelReference }) {
  return (
    <section aria-labelledby="guide-title" className="grid gap-3">
      <span className="eyebrow">Label guide</span>
      <h2 id="guide-title" className="text-2xl">
        The {LABELS.length} labels the model can predict
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {LABELS.filter((l) => model.ref[l]).map((label) => (
          <Card key={label} className="shadow-none">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="font-display text-lg">{label}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-0">
              <Shape loads={model.ref[label]} />
              <p className="text-sm text-muted-foreground">{LABEL_DESCRIPTIONS[label]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
