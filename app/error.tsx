"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 p-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          The page hit an unexpected error. Try again, and if it keeps happening, contact Data &amp;
          Technology{error.digest ? ` with reference ${error.digest}` : ""}.
        </AlertDescription>
      </Alert>
      <div>
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
      </div>
    </div>
  );
}
