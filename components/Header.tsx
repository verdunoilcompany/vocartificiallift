"use client";

import Link from "next/link";
import { Activity, CircleUser } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUser } from "@/app/contexts/UserContext";

export const APP_NAME = "Dynacard Classifier Review";

export function Header() {
  const { username, isLoading } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate font-display text-xl font-semibold tracking-wide">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <CircleUser className="h-4 w-4" aria-hidden />
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="font-mono" data-testid="username">
                {username ?? "Not signed in"}
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
