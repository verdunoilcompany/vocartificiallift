import { NextResponse } from "next/server";

import { getPredictionWells, type PredictionWell } from "@/lib/mldb/predictions";
import { mldbFailed, mldbNotConfigured } from "@/lib/mldb/route-helpers";

export const dynamic = "force-dynamic";

/** GET /api/mldb/wells: every well that has dynocards in MLDB, A–Z. */
export async function GET() {
  const off = mldbNotConfigured();
  if (off) return off;
  try {
    const wells = await getPredictionWells();
    return NextResponse.json<{ wells: PredictionWell[] }>({ wells });
  } catch (error) {
    return mldbFailed("wells", error);
  }
}
