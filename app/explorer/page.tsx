import type { Metadata } from "next";

import { DynocardReview } from "@/app/components/DynocardReview";

export const metadata: Metadata = { title: "Dynocard Explorer" };

/** Dynocard Classifier features plus Area / Route / Well filters and a paged multi-card grid. */
export default function ExplorerPage() {
  return <DynocardReview title="Dynocard Explorer" hierarchyFilter gallery />;
}
