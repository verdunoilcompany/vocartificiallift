import { NextResponse } from "next/server";
import { getModelReference } from "@/lib/cards-repo";
import type { ApiError, ModelReference } from "@/types/dynacard";

export const dynamic = "force-dynamic";

/** GET /api/model — typical shape per label and per-bin importance. */
export async function GET() {
  try {
    return NextResponse.json<ModelReference>(await getModelReference());
  } catch (error) {
    console.error("Failed to read model reference:", error);
    return NextResponse.json<ApiError>({ error: "Could not read the model reference." }, { status: 500 });
  }
}
