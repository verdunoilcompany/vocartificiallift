import { NextResponse } from "next/server";

import { isMssqlConfigured } from "@/lib/mssql";
import { getMorningReport } from "@/lib/xspoc/morning-report";
import type { ApiError } from "@/types/dynocard";
import type { MorningReportResponse } from "@/types/xspoc";

export const dynamic = "force-dynamic";

/** GET /api/xspoc/morning-report: the live morning report from XSPOC. */
export async function GET() {
  if (!isMssqlConfigured()) {
    return NextResponse.json<ApiError>(
      {
        error:
          "The XSPOC database connection is not configured on this server.",
      },
      { status: 503 },
    );
  }
  try {
    const rows = await getMorningReport();
    return NextResponse.json<MorningReportResponse>({
      rows,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("XSPOC morning report query failed:", error);
    return NextResponse.json<ApiError>(
      {
        error:
          "Could not read the morning report from XSPOC. Check the database connection and permissions.",
      },
      { status: 502 },
    );
  }
}
