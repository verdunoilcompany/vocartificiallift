import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Who is signed in. The rules (IIS headers, or the hub SSO email when AUTH_MODE=hub) are in lib/auth.ts.
export async function GET(request: NextRequest) {
  try {
    const { username, source } = resolveUser(request);

    // Log header names (not values) in development when no user was found
    if (process.env.NODE_ENV !== "production" && !username) {
      console.log("Available headers:", Array.from(request.headers.keys()));
    }

    return NextResponse.json({
      username,
      authenticated: username !== "", // username is '' (not 'unknown') when no user is found
      source,
    });
  } catch (error) {
    console.error("Error in user authentication:", error);
    return NextResponse.json(
      {
        username: "unknown",
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "error",
      },
      { status: 200 }, // Still return 200 but with unknown user
    );
  }
}
