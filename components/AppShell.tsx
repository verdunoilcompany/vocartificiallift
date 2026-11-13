"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const COLLAPSED_KEY = "voc-sidebar-collapsed";

/** Header on top, left-hand menu, page content and footer to the right. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });

  return (
    <div className="flex min-h-full w-full flex-col">
      <Header
        menuOpen={mobileOpen}
        onMenuClick={() => setMobileOpen((o) => !o)}
      />
      <div className="flex w-full flex-1">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" className="w-full flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
