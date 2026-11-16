import { NextResponse } from "next/server";

import { readSnapshot } from "@/lib/xspoc/morning-report";
import type { ApiError } from "@/types/dynocard";
import type { MorningSnapshot } from "@/types/xspoc";

export const dynamic = "force-dynamic";

/** GET /api/xspoc/morning-report/snapshots/YYYY-MM-DD: one saved 6 AM report. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json<ApiError>(
      { error: "Use a date like 2026-11-16." },
      { status: 400 },
    );
  }
  const snap = await readSnapshot(date);
  if (!snap) {
    return NextResponse.json<ApiError>(
      { error: `No 6 AM report was saved for ${date}.` },
      { status: 404 },
    );
  }
  return NextResponse.json<MorningSnapshot>(snap);
}
