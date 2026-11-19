/**
 * API URL helper for handling basePath in Next.js
 *
 * Next.js automatically handles basePath for:
 * - next/link navigation
 * - next/router
 *
 * However, fetch() calls and window.location assignments need manual handling.
 * This helper ensures consistency when constructing URLs.
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/als";

/**
 * Constructs a full API URL with the basePath prefix
 * @param path - The API path starting with / (e.g., '/api/groups')
 * @returns The full URL with basePath prefix
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

/**
 * Constructs a full page URL with the basePath prefix
 * Useful for window.location.href assignments
 * @param path - The page path starting with / (e.g., '/dca')
 * @returns The full URL with basePath prefix
 */
export function pageUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export { basePath };
