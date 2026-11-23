import { NextResponse } from "next/server";

import { getPredictionCards } from "@/lib/mldb/predictions";
import { mldbFailed, mldbNotConfigured, readRange } from "@/lib/mldb/route-helpers";
import type { MldbCardsResponse } from "@/types/dynocard";

export const dynamic = "force-dynamic";

/** GET /api/mldb/cards?from=YYYY-MM-DD&to=YYYY-MM-DD[&well=NodeID]: full cards from MLDB. */
export async function GET(request: Request) {
  const off = mldbNotConfigured();
  if (off) return off;
  const parsed = readRange(request.url, true);
  if (parsed instanceof NextResponse) return parsed;
  try {
    const cards = await getPredictionCards(parsed.range, parsed.well);
    return NextResponse.json<MldbCardsResponse>({
      cards,
      ...parsed.range,
      well: parsed.well,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return mldbFailed("dynocards", error);
  }
}
