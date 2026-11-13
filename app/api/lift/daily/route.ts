import { NextResponse, type NextRequest } from "next/server";
import { getDailyRows } from "@/lib/lift/sample";
import type { ApiError } from "@/types/dynocard";
import type { DailyRow } from "@/types/lift";

export const dynamic = "force-dynamic";

/** GET /api/lift/daily?date=YYYY-MM-DD — one row per well for that production date. */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json<ApiError>(
      { error: "Pass date as YYYY-MM-DD." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json<{ rows: DailyRow[] }>({
      rows: getDailyRows(date),
    });
  } catch (error) {
    console.error("Failed to load daily rows:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not load the daily data." },
      { status: 500 },
    );
  }
}
