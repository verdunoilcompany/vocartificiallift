import { NextResponse } from "next/server";
import { getDataset } from "@/lib/lift/sample";
import type { ApiError } from "@/types/dynocard";
import type { WellsResponse } from "@/types/lift";

export const dynamic = "force-dynamic";

/** GET /api/lift/wells — every well with its hierarchy and current state. */
export async function GET() {
  try {
    const ds = getDataset();
    return NextResponse.json<WellsResponse>({
      wells: ds.wells,
      latestDate: ds.days[ds.days.length - 1],
    });
  } catch (error) {
    console.error("Failed to load wells:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not load the well list." },
      { status: 500 },
    );
  }
}
