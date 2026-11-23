import { NextResponse } from "next/server";

import { getPredictionLabels } from "@/lib/mldb/predictions";
import { mldbFailed, mldbNotConfigured, readRange } from "@/lib/mldb/route-helpers";
import type { MldbLabelsResponse } from "@/types/dynocard";

export const dynamic = "force-dynamic";

/** GET /api/mldb/predictions?from=&to=: well, date and label per card (Daily Dashboard). */
export async function GET(request: Request) {
  const off = mldbNotConfigured();
  if (off) return off;
  const parsed = readRange(request.url, false);
  if (parsed instanceof NextResponse) return parsed;
  try {
    const cards = await getPredictionLabels(parsed.range);
    return NextResponse.json<MldbLabelsResponse>({
      cards,
      ...parsed.range,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return mldbFailed("predictions", error);
  }
}
