import { NextRequest, NextResponse } from "next/server";
import { CardParseError, parseCsv, rowsToCards } from "@/lib/dynacard/parse";
import { readWorkbookRows } from "@/lib/excel";
import type { ApiError, CardsResponse } from "@/types/dynacard";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * POST /api/cards/upload — multipart form with a `file` field (.csv or .xlsx).
 * Returns the parsed cards; nothing is stored on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json<ApiError>({ error: "No file was uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json<ApiError>({ error: "The file is larger than 25 MB." }, { status: 413 });
    }

    const name = file.name.toLowerCase();
    let rows: string[][];
    if (name.endsWith(".xlsx")) {
      rows = await readWorkbookRows(await file.arrayBuffer());
    } else if (name.endsWith(".csv") || file.type === "text/csv") {
      rows = parseCsv(await file.text());
    } else {
      return NextResponse.json<ApiError>({ error: "Upload a .csv or .xlsx file." }, { status: 415 });
    }

    const cards = rowsToCards(rows);
    return NextResponse.json<CardsResponse>({ cards, source: "upload", fileName: file.name });
  } catch (error) {
    if (error instanceof CardParseError) {
      return NextResponse.json<ApiError>({ error: error.message }, { status: 422 });
    }
    console.error("Upload failed:", error);
    return NextResponse.json<ApiError>({ error: "Could not read the file." }, { status: 500 });
  }
}
