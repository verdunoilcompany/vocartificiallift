import { Suspense } from "react";
import type { Metadata } from "next";

import { SetpointReport } from "@/app/components/lift/SetpointReport";

export const metadata: Metadata = { title: "Setpoint Report" };

export default function Page() {
  return (
    <Suspense>
      <SetpointReport />
    </Suspense>
  );
}
