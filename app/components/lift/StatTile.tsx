import { cn } from "@/lib/utils";

/** Highlighted count tile (Well Filtered, Well Selected, Total Well Count). */
export function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-100 px-4 py-5 text-center text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100",
        className,
      )}
    >
      <span className="font-display text-xl font-semibold">{label}</span>
      <span className="font-display text-3xl font-semibold tabular">
        {value}
      </span>
    </div>
  );
}
