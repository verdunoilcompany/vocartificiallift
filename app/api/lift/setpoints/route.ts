import { NextResponse, type NextRequest } from "next/server";
import { getSetpoints } from "@/lib/lift/sample";
import type { ApiError } from "@/types/dynocard";
import type { SetpointChange } from "@/types/lift";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/lift/setpoints?start=YYYY-MM-DD&end=YYYY-MM-DD — setpoint changes in the range. */
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
  try {
    return NextResponse.json<{ changes: SetpointChange[] }>({
      changes: getSetpoints(start, end),
    });
  } catch (error) {
    console.error("Failed to load setpoints:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not load the setpoint changes." },
      { status: 500 },
    );
  }
}
