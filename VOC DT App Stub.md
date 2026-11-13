# App Stub Out for Verdun Data & Technology

## Technical Stack

1. Next.js - version 15 (**do not install version 16**). Pin `next@15.x`.
2. Typescript - `strict: true`.
3. TailwindCss - **version 3** (`tailwind@^3`, `tailwind-merge`, `clsx`). Pin v3; do **not** install Tailwind v4 — Shadcn + the `tailwind.config.ts` brand-color block below assume v3.
4. Shadcn - use only shad components - [Shadcn](https://ui.shadcn.com/docs/components)
5. Data connectivity - create libraries for any/all connections (Excel, MSSQL, Postgres, etc). See **Data Layer** under Notes.
6. Plotlyjs (plotly.js-dist)
7. Mapbox (mapbox-gl) - requires a public token in `.env` (`NEXT_PUBLIC_MAPBOX_TOKEN`).
8. Lucide for all icons (lucide-react)
9. Sonner - toasts
10. Tanstack - all table structure components (`@tanstack/react-table`).
11. .env to be used for any sensitive information. Provide a committed `.env.example` enumerating every variable (no secret values). `.env` and `.env.local` must be git-ignored.
12. Playwright - for any e2e testing/regression scenarios. Vitest for unit/component tests.

- Package manager: **npm** (use `package-lock.json`). Do not mix in pnpm/yarn.
- Node: **20 LTS or 22 LTS**. Verify git and Node are installed before proceeding (`git --version`, `node --version`).
- Deployment target: **on-prem IIS on Windows via iisnode** (this is why the auth code below reads IIS headers). Use `output: 'standalone'` and include a `web.config`. If a project is NOT IIS-hosted, confirm with the user and drop the IIS-specific auth.
- Use latest Opus model.

---

## Project Folder Structure

projectname (root)
/app
/app/api
/app/components - functional page components
/app/contexts
/app/hooks
/components - general UI components (shadcn lands in /components/ui)
/db - any associated data flat files (Excel)
/lib
/public
/types
/notes --> any claude created md files
/tests --> Playwright + Vitest specs

> NOTE: Files containing JSX, use the `.tsx` extension (e.g. `UserContext.tsx`), not `.ts`.

---

## Page Layout

- Page layout should always be 100%
- Navigation header component - App Name - user name (justified between)
- Footer component
- Responsive (mobile → desktop). Light/dark mode via shadcn theming.
- Include App Router state files: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`,
  and a global error boundary. Each data view needs explicit loading/empty/error states.
- Accessibility baseline: semantic landmarks, keyboard navigation, labeled controls.
- `app/layout.tsx` sets `metadata` (title template, description) and a favicon.

---

## Notes

1. basePath is required in project. e.g. https://localhost:3000/<basePathName>
   --> prompt user for base path name.

   Wire it up in `next.config.js` (the helper below only reads it, it does not set it):

```javascript
/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/<basePathName>";
module.exports = {
  output: "standalone", // required for iisnode deployment
  basePath,
  assetPrefix: basePath,
};
```

Set `NEXT_PUBLIC_BASE_PATH` in `.env` so config and the `api.ts` helper stay in sync.

use following for /lib/api.ts:

```javascript
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

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/<basePathName>';

/**
 * Constructs a full API URL with the basePath prefix
 * @param path - The API path starting with / (e.g., '/api/groups')
 * @returns The full URL with basePath prefix
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

/**
 * Constructs a full page URL with the basePath prefix
 * Useful for window.location.href assignments
 * @param path - The page path starting with / (e.g., '/dca')
 * @returns The full URL with basePath prefix
 */
export function pageUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export { basePath };
```

2. tailwind.config.ts (Tailwind v3) - use the following brand colors for theme.
   (`accent` is red — confirm with the user it's an accent vs. a destructive/error color.)

```css
brand: {
	primary: '#2E8B57',
	secondary: '#3CB371',
	accent: '#dc2626',
	neutral: '#6b7280'
},
```

**Data Layer** (item 5 of stack): put every connector in `/lib` (e.g. `lib/mssql.ts`,
`lib/postgres.ts`, `lib/excel.ts`), each marked `import 'server-only'` so credentials never
reach the client bundle. Read all connection strings/credentials from `.env` (never hard-code).
Drivers: `mssql` for MSSQL, `pg` for Postgres, `exceljs` for Excel. Use a shared connection
pool per source. Connectors expose a typed interface; query results map to `/types`.

**.env contract**: maintain a committed `.env.example` listing every variable with placeholder
values. At minimum: `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_MAPBOX_TOKEN`, plus per-source DB
connection vars (e.g. `MSSQL_HOST`, `MSSQL_USER`, `MSSQL_PASSWORD`, `MSSQL_DATABASE`,
`PG_CONNECTION_STRING`). Dev-only auth override: `AUTH_USER`.

3. User Auth - leverage the following for /lib/auth.ts.
   (Primary path is the IIS request _headers_; the `process.env['x-iisnode-*']` fallbacks
   are legacy iisnode behavior and are not reliable in the modern Next runtime — keep them,
   but treat headers as authoritative.)

```javascript
import { NextRequest } from 'next/server';

/**
 * Extracts the current authenticated user from IIS request headers.
 * Falls back to environment variables in development mode.
 * Returns lowercase username without domain prefix, or null if not authenticated.
 */
export function getCurrentUser(request: NextRequest): string | null {
  const remoteUser = request.headers.get('x-iisnode-auth_user') ||
                    request.headers.get('x-iisnode-auth-user') ||
                    request.headers.get('x-iisnode-logon_user') ||
                    request.headers.get('x-iisnode-logon-user') ||
                    request.headers.get('x-iisnode-remote_user') ||
                    request.headers.get('x-iisnode-remote-user') ||
                    request.headers.get('x-remote-user') ||
                    request.headers.get('remote-user') ||
                    request.headers.get('x-forwarded-user') ||
                    process.env['x-iisnode-auth_user'] ||
                    process.env['x-iisnode-logon_user'] ||
                    process.env['x-iisnode-remote_user'] ||
                    process.env.AUTH_USER ||
                    process.env.LOGON_USER ||
                    process.env.REMOTE_USER;

  if (remoteUser) {
    const cleanUsername = remoteUser.includes('\\') ? remoteUser.split('\\')[1] : remoteUser;
    if (!cleanUsername.endsWith('$')) {
      return cleanUsername.toLowerCase();
    }
  }

  if (process.env.NODE_ENV === 'development') {
    const devUser = process.env.USERNAME || process.env.USER || '';
    if (devUser && !devUser.endsWith('$')) {
      return devUser.toLowerCase();
    }
  }

  return null;
}
```

Auth User api route.ts:

```javascript
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export async function GET(request: NextRequest) {
  try {
    let username = '';
    let source = 'none';

    // Try multiple methods to get the current user
    try {
      // Method 1: Check for Windows Authentication headers (IIS)
      // IIS with Windows Auth typically passes the username in these headers
      // Note: IISNode converts headers to environment variables with 'x-iisnode-' prefix
      const remoteUser = request.headers.get('x-iisnode-auth_user') ||
                        request.headers.get('x-iisnode-auth-user') ||
                        request.headers.get('x-iisnode-logon_user') ||
                        request.headers.get('x-iisnode-logon-user') ||
                        request.headers.get('x-iisnode-remote_user') ||
                        request.headers.get('x-iisnode-remote-user') ||
                        request.headers.get('x-remote-user') ||
                        request.headers.get('remote-user') ||
                        request.headers.get('x-forwarded-user') ||
                        process.env['x-iisnode-auth_user'] ||
                        process.env['x-iisnode-logon_user'] ||
                        process.env['x-iisnode-remote_user'] ||
                        process.env.AUTH_USER ||
                        process.env.LOGON_USER ||
                        process.env.REMOTE_USER;

      if (remoteUser) {
        // Remove domain prefix if present (DOMAIN\username -> username)
        let cleanUsername = remoteUser.includes('\\') ? remoteUser.split('\\')[1] : remoteUser;

        // Filter out computer accounts (end with $)
        if (!cleanUsername.endsWith('$')) {
          username = cleanUsername.toLowerCase();
          source = 'iis-windows-auth';
          console.log('Detected user from IIS/Windows Auth:', username);
        } else {
          console.warn('Computer account detected:', cleanUsername);
        }
      }

      // Method 2: For local development only - use environment variables
      if (!username && process.env.NODE_ENV === 'development') {
        const devUser = process.env.USERNAME || process.env.USER || '';
        if (devUser && !devUser.endsWith('$')) {
          username = devUser.toLowerCase();
          source = 'dev-env';
          console.log('Using local environment username for development:', username);
        }
      }

      // Method 3: Node.js os.userInfo() (last resort - will get app pool user)
      if (!username && process.env.NODE_ENV === 'development') {
        try {
          const userInfo = os.userInfo();
          const osUser = userInfo.username;
          if (!osUser.endsWith('$')) {
            username = osUser.toLowerCase();
            source = 'os-userinfo';
            console.log('Using os.userInfo:', username);
          }
        } catch (osError) {
          console.log('os.userInfo failed:', osError);
        }
      }

      // Log all headers in development for debugging if still no username
      if (process.env.NODE_ENV !== 'production' && !username) {
        console.log('Available headers:', Object.fromEntries(request.headers.entries()));
      }

    } catch (error) {
      console.error('Error detecting user:', error);
    }

    console.log(`Final user authenticated: ${username || 'unknown'} (source: ${source})`);

    return NextResponse.json({
      username: username,
      authenticated: username !== '', // username is '' (not 'unknown') when no user is found
      source: source
    });
  } catch (error) {
    console.error('Error in user authentication:', error);
    return NextResponse.json(
      {
        username: 'unknown',
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'error'
      },
      { status: 200 } // Still return 200 but with unknown user
    );
  }
}
```

Auth User Context - UserContext.tsx (must be `.tsx` — contains JSX):

```javascript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

interface UserContextType {
  username: string | null;
  authenticated: boolean;
  source: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/user'));
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setUsername(data.username || null);
      setAuthenticated(data.authenticated || false);
      setSource(data.source || null);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUsername(null);
      setAuthenticated(false);
      setSource(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        username,
        authenticated,
        source,
        isLoading,
        error,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

---

## USER PROMPT

Ask user for details of application. They must describe in detail the app to build or migrate.
Collect, at minimum, before scaffolding:

- App name and **base path name** (Notes #1).
- Pages/routes and primary purpose of each.
- Data sources + where their credentials live (which DBs/Excel files).
- Auth requirement: IIS Windows Auth (default) or none.
- Deployment target (default: on-prem IIS) — confirm if different.
- New GitHub remote repo URL.
- If **migration**: the original code location (GitHub URL or file path) **must** be provided.

After collecting, restate the resolved choices (versions, base path, data sources, deployment)
and get the user's confirmation **before** generating files.

---

## OUTPUT

1. Create a `CLAUDE.md` (uppercase — this is what Claude Code auto-loads) noting the tech
   stack, app folder structure, and app intent from the original user prompt.
2. Add a `.gitignore` that excludes `node_modules`, `.next`, `.env`, `.env.local`, and any
   secret-bearing or large data files under `/db` (confirm with user whether `/db` is committed).
3. Run `tsc --noEmit` and lint. Both must pass with **zero errors** — fix and rerun until clean.
4. Test for a successful production build (`next build`).
5. Initialize git, wire up the GitHub remote, make the initial commit, and push.

---

## VERSION HISTORY

- 1.0 | Jason Codianne | 05/11/2026 | init
- 1.1 | Jason Codianne | 05/22/2026 | Tech updates, misc clean up
- 1.2 | Jason Codianne | 06/02/2026 | Output, folder structure update
