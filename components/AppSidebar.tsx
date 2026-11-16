"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Compass,
  Sunrise,
  GitCompareArrows,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Optimization",
    items: [
      { href: "/daily", label: "Daily Dashboard", icon: LayoutDashboard },
      { href: "/trends", label: "Trend Analysis", icon: LineChart },
      { href: "/setpoints", label: "Setpoint Report", icon: SlidersHorizontal },
      { href: "/review", label: "Review", icon: GitCompareArrows },
    ],
  },
  {
    title: "Dynocards",
    items: [
      { href: "/", label: "Dynocard Classifier", icon: Activity },
      { href: "/explorer", label: "Dynocard Explorer", icon: Compass },
      { href: "/morning-report", label: "Morning Reports", icon: Sunrise },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
}

/** Left-hand navigation. Icon-only when collapsed on desktop; a slide-over drawer on small screens. */
export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={onNavigate}
        />
      )}
      {/* Wrapper stretches to the page height so the menu background runs the full length. */}
      <div className="md:shrink-0 md:border-r md:bg-[hsl(var(--sidebar))]">
        <aside
          id="app-sidebar"
          aria-label="Main navigation"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-[hsl(var(--sidebar))] transition-transform md:sticky md:border-r-0 md:top-14 md:z-30 md:h-[calc(100vh-3.5rem)] md:translate-x-0 md:transition-[width]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            collapsed ? "md:w-16" : "md:w-60",
          )}
        >
          <div className="flex h-14 items-center px-4 font-display text-lg font-semibold md:hidden">
            Menu
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="mb-4">
                <p
                  className={cn("eyebrow mb-1 px-3", collapsed && "md:sr-only")}
                >
                  {section.title}
                </p>
                <ul className="grid gap-0.5">
                  {section.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active &&
                              "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                            collapsed && "md:justify-center md:px-0",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span
                            className={cn(
                              "truncate",
                              collapsed && "md:sr-only",
                            )}
                          >
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="hidden border-t p-2 md:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapsed}
              className={cn(
                "w-full justify-start gap-3 text-muted-foreground",
                collapsed && "justify-center px-0",
              )}
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              {!collapsed && <span>Collapse</span>}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
