import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { dataDir } from "@/lib/data-dir";
import type { ApiError } from "@/types/dynocard";

export const dynamic = "force-dynamic";

/**
 * GET /api/cards/default-predictions: the bundled default for the Daily Dashboard condition
 * tiles and per-well table (well, date and label per card from test_predictions.csv).
 */
export async function GET() {
  try {
    const raw = await fs.readFile(
      path.join(dataDir(), "default-predictions.json"),
      "utf8",
    );
    return new NextResponse(raw, {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to read default predictions:", error);
    return NextResponse.json<ApiError>(
      { error: "Could not read the default predictions." },
      { status: 500 },
    );
  }
}
