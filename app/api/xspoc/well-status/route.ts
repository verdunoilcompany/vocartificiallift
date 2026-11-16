import { NextResponse } from "next/server";

import { isMssqlConfigured } from "@/lib/mssql";
import { getWellStatus } from "@/lib/xspoc/well-status";
import type { ApiError } from "@/types/dynocard";
import type { WellStatusResponse } from "@/types/xspoc";

export const dynamic = "force-dynamic";

/** GET /api/xspoc/well-status: live run status per well from XSPOC (VOC-SQL05). */
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
    const rows = await getWellStatus();
    return NextResponse.json<WellStatusResponse>({
      rows,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Log the detail on the server; don't send connection details to the browser.
    console.error("XSPOC well-status query failed:", error);
    return NextResponse.json<ApiError>(
      {
        error:
          "Could not read well status from XSPOC. Check the database connection and permissions.",
      },
      { status: 502 },
    );
  }
}
