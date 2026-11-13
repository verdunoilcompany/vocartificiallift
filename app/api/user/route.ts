import { NextRequest, NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let username = "";
    let source = "none";

    try {
      // Method 1: Windows Authentication headers (IIS). iisnode promotes the
      // AUTH_USER / LOGON_USER / REMOTE_USER server variables to x-iisnode-* headers
      // (see promoteServerVars in web.config).
      const remoteUser =
        request.headers.get("x-iisnode-auth_user") ||
        request.headers.get("x-iisnode-auth-user") ||
        request.headers.get("x-iisnode-logon_user") ||
        request.headers.get("x-iisnode-logon-user") ||
        request.headers.get("x-iisnode-remote_user") ||
        request.headers.get("x-iisnode-remote-user") ||
        request.headers.get("x-remote-user") ||
        request.headers.get("remote-user") ||
        request.headers.get("x-forwarded-user") ||
        process.env["x-iisnode-auth_user"] ||
        process.env["x-iisnode-logon_user"] ||
        process.env["x-iisnode-remote_user"] ||
        process.env.AUTH_USER ||
        process.env.LOGON_USER ||
        process.env.REMOTE_USER;

      if (remoteUser) {
        // Remove domain prefix if present (DOMAIN\username -> username)
        const cleanUsername = remoteUser.includes("\\") ? remoteUser.split("\\")[1] : remoteUser;

        // Filter out computer accounts (end with $)
        if (!cleanUsername.endsWith("$")) {
          username = cleanUsername.toLowerCase();
          source = "iis-windows-auth";
        } else {
          console.warn("Computer account detected:", cleanUsername);
        }
      }

      // Method 2: For local development only - use environment variables
      if (!username && process.env.NODE_ENV === "development") {
        const devUser = process.env.USERNAME || process.env.USER || "";
        if (devUser && !devUser.endsWith("$")) {
          username = devUser.toLowerCase();
          source = "dev-env";
        }
      }

      // Method 3: Node.js os.userInfo() (last resort - will get app pool user)
      if (!username && process.env.NODE_ENV === "development") {
        try {
          const osUser = os.userInfo().username;
          if (!osUser.endsWith("$")) {
            username = osUser.toLowerCase();
            source = "os-userinfo";
          }
        } catch (osError) {
          console.log("os.userInfo failed:", osError);
        }
      }

      // Log header names (not values) in development when no user was found
      if (process.env.NODE_ENV !== "production" && !username) {
        console.log("Available headers:", Array.from(request.headers.keys()));
      }
    } catch (error) {
      console.error("Error detecting user:", error);
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
