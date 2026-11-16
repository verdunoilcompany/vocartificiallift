import { NextResponse } from "next/server";

import { isMssqlConfigured } from "@/lib/mssql";
import { ensureTodaySnapshot, listSnapshots } from "@/lib/xspoc/morning-report";
import type { ApiError } from "@/types/dynocard";
import type { MorningSnapshotInfo } from "@/types/xspoc";

export const dynamic = "force-dynamic";

/**
 * GET /api/xspoc/morning-report/snapshots: saved 6 AM reports, newest first.
 * Also captures today's if it's past 6:00 and the scheduler missed it (e.g. the server was asleep).
 */
export async function GET() {
  if (isMssqlConfigured()) {
    await ensureTodaySnapshot().catch((err) =>
      console.error("Morning report catch-up failed:", err),
    );
  }
  try {
    return NextResponse.json<{ snapshots: MorningSnapshotInfo[] }>({
      snapshots: await listSnapshots(),
    });
  } catch (error) {
    console.error("Listing morning report snapshots failed:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not list the saved 6 AM reports." },
      { status: 500 },
    );
  }
}
