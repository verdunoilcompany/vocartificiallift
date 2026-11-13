import { Suspense } from "react";
import type { Metadata } from "next";

import { DailyDashboard } from "@/app/components/lift/DailyDashboard";

export const metadata: Metadata = { title: "Daily Dashboard" };

export default function Page() {
  return (
    <Suspense>
      <DailyDashboard />
    </Suspense>
  );
}
