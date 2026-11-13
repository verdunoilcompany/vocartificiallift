import { NextResponse, type NextRequest } from "next/server";
import { getTrend } from "@/lib/lift/sample";
import type { ApiError } from "@/types/dynocard";
import type { TrendPoint } from "@/types/lift";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/lift/trend?start=YYYY-MM-DD&end=YYYY-MM-DD&wells=A|B
 * Daily totals/averages over the listed wells (all wells when `wells` is empty).
 * Wells are separated by "|" because names can contain commas.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const start = p.get("start") ?? "";
  const end = p.get("end") ?? "";
  if (!DATE.test(start) || !DATE.test(end)) {
    return NextResponse.json<ApiError>(
      { error: "Pass start and end as YYYY-MM-DD." },
      { status: 400 },
    );
  }
  const wells = (p.get("wells") ?? "").split("|").filter(Boolean);
  try {
    return NextResponse.json<{ points: TrendPoint[] }>({
      points: getTrend(wells, start, end),
    });
  } catch (error) {
    console.error("Failed to load trend:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not load the trend data." },
      { status: 500 },
    );
  }
}
