import "server-only";
import { NextRequest } from "next/server";
import os from "os";

export type AuthSource = "hub-sso" | "iis-windows-auth" | "dev-env" | "os-userinfo" | "none";

/**
 * Current user. Two hosting modes, chosen by AUTH_MODE:
 *
 * - `hub` (Coolify, https://hub[dev]/als): the Traefik SSO guard (oauth2-proxy, Entra ID)
 *   forward-auths every request and sets X-Auth-Request-Email; the network ID is the part
 *   before @. Nothing else identifies a user in this mode - not the IIS / forwarding headers
 *   (a browser can send those itself in a container) and not AUTH_USER / LOGON_USER /
 *   REMOTE_USER, which would sign every visitor in as one person.
 * - IIS (AUTH_MODE unset): unchanged - IIS headers first, then the legacy env fallbacks.
 *   Headers are authoritative; the process.env['x-iisnode-*'] fallbacks are legacy iisnode
 *   behavior kept only for compatibility.
 *
 * Returns a lowercase username without domain prefix ('' when not authenticated).
 */
export function resolveUser(request: NextRequest): { username: string; source: AuthSource } {
  if (process.env.AUTH_MODE?.toLowerCase() === "hub") {
    const email = request.headers.get("x-auth-request-email")?.trim();
    if (email && email.includes("@") && !/[,\s]/.test(email)) {
      const username = email.split("@")[0].toLowerCase();
      if (username) return { username, source: "hub-sso" };
    }
    return { username: "", source: "none" };
  }

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
    // Remove domain prefix if present (DOMAIN\username -> username); skip computer accounts.
    const cleanUsername = remoteUser.includes("\\") ? remoteUser.split("\\")[1] : remoteUser;
    if (!cleanUsername.endsWith("$")) return { username: cleanUsername.toLowerCase(), source: "iis-windows-auth" };
    console.warn("Computer account detected:", cleanUsername);
  }

  // Local development only.
  if (process.env.NODE_ENV === "development") {
    const devUser = process.env.USERNAME || process.env.USER || "";
    if (devUser && !devUser.endsWith("$")) return { username: devUser.toLowerCase(), source: "dev-env" };
    try {
      const osUser = os.userInfo().username;
      if (!osUser.endsWith("$")) return { username: osUser.toLowerCase(), source: "os-userinfo" };
    } catch (osError) {
      console.log("os.userInfo failed:", osError);
    }
  }

  return { username: "", source: "none" };
}

/** Lowercase username without domain prefix, or null if not authenticated. */
export function getCurrentUser(request: NextRequest): string | null {
  return resolveUser(request).username || null;
}
