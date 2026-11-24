import { Suspense } from "react";
import type { Metadata } from "next";

import { DynocardReview } from "@/app/components/DynocardReview";

export const metadata: Metadata = { title: "Dynocard Classifier" };

export default function ClassifierPage() {
  return (
    <Suspense>
      <DynocardReview />
    </Suspense>
  );
}
