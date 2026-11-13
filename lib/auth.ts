import "server-only";
import { NextRequest } from "next/server";

/**
 * Extracts the current authenticated user from IIS request headers.
 * Falls back to environment variables in development mode.
 * Returns lowercase username without domain prefix, or null if not authenticated.
 *
 * Headers are authoritative. The process.env['x-iisnode-*'] fallbacks are legacy
 * iisnode behavior and are kept only for compatibility.
 */
export function getCurrentUser(request: NextRequest): string | null {
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
    const cleanUsername = remoteUser.includes("\\") ? remoteUser.split("\\")[1] : remoteUser;
    if (!cleanUsername.endsWith("$")) {
      return cleanUsername.toLowerCase();
    }
  }

  if (process.env.NODE_ENV === "development") {
    const devUser = process.env.USERNAME || process.env.USER || "";
    if (devUser && !devUser.endsWith("$")) {
      return devUser.toLowerCase();
    }
  }

  return null;
}
