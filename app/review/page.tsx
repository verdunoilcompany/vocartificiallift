import { Suspense } from "react";
import type { Metadata } from "next";

import { ReviewDashboard } from "@/app/components/lift/ReviewDashboard";

export const metadata: Metadata = { title: "Review" };

export default function Page() {
  return (
    <Suspense>
      <ReviewDashboard />
    </Suspense>
  );
}
