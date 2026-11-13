"use client";

import { useRef } from "react";
import { FileUp, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CardToolbarProps {
  uploading: boolean;
  status: string;
  onUpload: (file: File) => void;
  onShowSample: () => void;
}

export function CardToolbar({ uploading, status, onUpload, onShowSample }: CardToolbarProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Button onClick={() => input.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" /> : <FileUp />}
        Load predictions (CSV / Excel)
      </Button>
      <Button variant="outline" onClick={onShowSample} disabled={uploading}>
        <RotateCcw /> Show sample cards
      </Button>
      <span className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="status">
        {status}
      </span>
    </div>
  );
}
