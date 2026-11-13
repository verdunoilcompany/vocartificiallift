import { Suspense } from "react";
import type { Metadata } from "next";

import { TrendAnalysis } from "@/app/components/lift/TrendAnalysis";

export const metadata: Metadata = { title: "Trend Analysis" };

export default function Page() {
  return (
    <Suspense>
      <TrendAnalysis />
    </Suspense>
  );
}
