import { Suspense } from "react";

import { DynocardReview } from "@/app/components/DynocardReview";

export default function HomePage() {
  return (
    <Suspense>
      <DynocardReview />
    </Suspense>
  );
}
