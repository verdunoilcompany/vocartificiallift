import type { Metadata } from "next";

import { MorningReport } from "@/app/components/MorningReport";

export const metadata: Metadata = { title: "Morning Reports" };

export default function MorningReportPage() {
  return <MorningReport />;
}
