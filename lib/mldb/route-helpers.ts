import "server-only";
import { NextResponse } from "next/server";

import { isMldbConfigured } from "@/lib/mldb/connection";
import { cardRangeError, type CardRange } from "@/lib/dynocard/card-range";
import type { ApiError } from "@/types/dynocard";

/** 503 when MLDB isn't set up on this server, else null. */
export function mldbNotConfigured() {
  return isMldbConfigured()
    ? null
    : NextResponse.json<ApiError>(
        { error: "The MLDB database connection is not configured on this server." },
        { status: 503 },
      );
}

/** Reads ?from=&to= (and ?well=) and checks the range; returns a 400 response when invalid. */
export function readRange(
  url: string,
  allowWell: boolean,
): { range: CardRange; well: string | null } | NextResponse<ApiError> {
  const q = new URL(url).searchParams;
  const well = allowWell ? q.get("well")?.trim() || null : null;
  if (well && well.length > 200) {
    return NextResponse.json<ApiError>({ error: "Well name is too long." }, { status: 400 });
  }
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const problem = cardRangeError({ from, to }, Boolean(well));
  if (problem) return NextResponse.json<ApiError>({ error: problem }, { status: 400 });
  return { range: { from, to }, well };
}

/** Logs the detail on the server; never sends connection details to the browser. */
export function mldbFailed(what: string, error: unknown) {
  console.error(`MLDB ${what} query failed:`, error);
  return NextResponse.json<ApiError>(
    { error: `Could not read ${what} from MLDB. Check the database connection and permissions.` },
    { status: 502 },
  );
}
