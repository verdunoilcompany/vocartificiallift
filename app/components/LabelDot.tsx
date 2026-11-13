import { cn } from "@/lib/utils";
import { isFullPump } from "@/lib/dynacard/labels";

/** Small status dot: green for Full Pump, neutral for everything else. */
export function LabelDot({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        isFullPump(label) ? "bg-good" : "bg-stroke-ref",
        className,
      )}
    />
  );
}
