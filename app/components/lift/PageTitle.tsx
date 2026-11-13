import type { ReactNode } from "react";

/** Dashboard title row: name on the left, page actions (e.g. Reset Well Selection) on the right. */
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-3xl leading-none">{title}</h1>
        {description && (
          <p className="max-w-[72ch] text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
