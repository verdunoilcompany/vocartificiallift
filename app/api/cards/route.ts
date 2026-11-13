import { NextResponse } from "next/server";
import { getSampleCards } from "@/lib/cards-repo";
import type { ApiError, CardsResponse } from "@/types/dynocard";

export const dynamic = "force-dynamic";

/** GET /api/cards — the bundled sample cards. */
export async function GET() {
  try {
    const cards = await getSampleCards();
    return NextResponse.json<CardsResponse>({ cards, source: "sample" });
  } catch (error) {
    console.error("Failed to read sample cards:", error);
    return NextResponse.json<ApiError>({ error: "Could not read the sample cards." }, { status: 500 });
  }
}
