"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleUser, Menu } from "lucide-react";

import verdunLogo from "@/public/verdun-logo.png";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUser } from "@/app/contexts/UserContext";

export const APP_NAME = "VOC Artificial Lift";

export function Header({
  onMenuClick,
  menuOpen = false,
}: {
  onMenuClick?: () => void;
  menuOpen?: boolean;
}) {
  const { username, isLoading } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
              aria-label="Open menu"
              aria-controls="app-sidebar"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link
            href="/daily-dashboard"
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Official logo (dark green/grey on transparent); a light chip keeps it legible in dark mode. */}
            <span className="shrink-0 rounded-md dark:bg-white/90 dark:px-1.5 dark:py-1">
              <Image
                src={verdunLogo}
                alt="Verdun Oil Company"
                priority
                unoptimized
                className="h-8 w-auto"
              />
            </span>
            <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border sm:block" />
            <span className="truncate font-display text-xl font-semibold tracking-wide">
              {APP_NAME}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <CircleUser className="h-4 w-4" aria-hidden />
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="hidden font-mono sm:inline" data-testid="username">
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
