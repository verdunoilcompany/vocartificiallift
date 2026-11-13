# Dynacard Classifier Review

Internal Verdun Data & Technology app for reviewing rod-pump downhole dynacards against the
label a classifier predicted. Migrated from a single-page HTML prototype into the standard VOC
D&T Next.js stack (see `VOC DT App Stub.md`).

## App intent (from the original request)

Build the Dynocard viewer as a Next.js app following the VOC D&T stub. Each card is binned into
50 scaled loads (L0–L24 upstroke, L25–L49 downstroke). The user picks a card and sees its shape
next to the typical shape of the predicted label, with the bins the model weighs most highlighted.

- One page (`/`): load predictions (CSV or .xlsx) or use the 25 bundled samples; filter by
  predicted label or "Needs review"; searchable/sortable card table; Plotly card viewer with a
  "Compare with" label and an importance overlay; a guide to the 10 labels.
- "Needs review" flags come from heuristics in `lib/dynacard/review.ts` (fillage vs. label,
  tubing-movement shape check), applied to samples and uploads alike.
- Uploads are parsed server-side and returned to the browser; nothing is stored.

## Resolved choices

| Item | Value |
| --- | --- |
| App name | Dynacard Classifier Review |
| Base path | `/dynacard` (`NEXT_PUBLIC_BASE_PATH`) |
| Data | `db/sample-cards.json`, `db/model-reference.json` (committed) + CSV/XLSX upload |
| Auth | IIS Windows Auth via iisnode (`lib/auth.ts`, `/api/user`) |
| Deploy | On-prem IIS + iisnode, `output: 'standalone'` |
| Repo | github.com/ypokraverdun/vocartificiallift |

## Tech stack

- Next.js **15** (App Router) — do not upgrade to 16. React 19. TypeScript `strict`.
- Tailwind CSS **v3** + shadcn/ui (new-york, CSS variables). Do not install Tailwind v4.
  Brand colors in `tailwind.config.ts` (`brand.primary` #2E8B57 → `--primary`;
  `brand.accent` #dc2626 → `--destructive`).
- Plotly (`plotly.js-dist`, dynamically imported client-side) for the card chart.
- TanStack Table **v8** for tables. Lucide icons. Sonner toasts. next-themes for light/dark.
- Data connectors in `/lib`, all `import "server-only"`: `excel.ts` (exceljs), `mssql.ts`,
  `postgres.ts` (pools ready, not yet used). Mapbox token helper in `lib/mapbox.ts` (unused).
- Fonts are self-hosted from `@fontsource/*` via `next/font/local` so builds need no internet.
- Vitest (unit, `tests/unit`) and Playwright (e2e, `tests/e2e`, runs the standalone build).
- npm only. Node 20+ (developed on Node 24 LTS).

## Folder structure

```
app/                 routes, layout, loading/error/not-found/global-error
app/api/             cards (GET samples), cards/upload (POST csv/xlsx), model, user
app/components/      page components (DynacardReview, CardTable, CardViewer, DynacardPlot, …)
app/contexts/        UserContext.tsx
app/hooks/           useDynacards (data + upload), useCssColor (theme colors for Plotly)
components/          Header, Footer, ThemeProvider, ThemeToggle
components/ui/       shadcn components
db/                  flat data files (only the two sample JSON files are committed)
iis/iisnode.js       iisnode entry point (named-pipe PORT); copied into the standalone build
lib/                 api.ts (basePath helpers), auth.ts, connectors, dynacard/ (parse, review, geometry, labels)
notes/               Claude-created notes
public/              static files
scripts/             prepare-standalone.mjs (postbuild)
tests/               unit/ (Vitest), e2e/ (Playwright)
types/               shared types
```

## Commands

```
npm run dev          # http://localhost:3000/dynacard
npm run typecheck    # tsc --noEmit (run dev or build once first so next-env.d.ts exists)
npm run lint         # eslint .
npm test             # vitest
npm run build        # next build + postbuild copies static/public/db/web.config/iisnode.js
npm run test:e2e     # playwright (needs a build; `npx playwright install chromium` once)
```

All of typecheck, lint, unit tests and build must pass with zero errors before committing.

## Conventions

- Use `apiUrl()` / `pageUrl()` from `lib/api.ts` for every `fetch` and `window.location`.
- Files with JSX use `.tsx`. Use only shadcn components for UI primitives.
- Every data view needs loading, empty and error states.
- Chart colors are CSS variables in `app/globals.css` (`--stroke-up`, `--stroke-down`, …);
  read them with `cssColor()` so Plotly follows the theme.
- If a server dependency fails with "Cannot find module …/require.mjs" in the standalone build,
  add it to `outputFileTracingIncludes` in `next.config.js` (see async-function / generator-function).

## Deployment (IIS)

1. `npm ci && npm run build` on a machine with the same Node major as the server.
2. Copy `.next/standalone/` to the IIS application folder for `/dynacard`. It contains
   `web.config`, `iisnode.js`, `server.js`, `.next/`, `public/`, `db/` and a trimmed `node_modules`.
3. Put production env vars (`NEXT_PUBLIC_BASE_PATH` is baked in at build time) in IIS / a `.env`
   next to `iisnode.js`.
4. In IIS Manager enable Windows Authentication and disable Anonymous on the application.
   `web.config` promotes `AUTH_USER`/`LOGON_USER`/`REMOTE_USER` to `x-iisnode-*` headers.
