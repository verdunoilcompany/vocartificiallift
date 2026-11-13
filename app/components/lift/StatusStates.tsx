import { AlertTriangle, Inbox } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Could not load data</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** "No data to display" panel used inside chart cards. */
export function EmptyState({
  title = "No data to display",
  detail = "Data may be filtered out",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 p-6 text-center">
      <Inbox className="mb-1 h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
