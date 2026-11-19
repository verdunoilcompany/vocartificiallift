# Dynocard Classifier Review

Internal Verdun Data & Technology app for reviewing rod-pump downhole dynocards against the
label a classifier predicted. Migrated from a single-page HTML prototype into the standard VOC
D&T Next.js stack (see `VOC DT App Stub.md`).

## App intent (from the original request)

Build the Dynocard viewer as a Next.js app following the VOC D&T stub. Each card is binned into
50 scaled loads (L0–L24 upstroke, L25–L49 downstroke). The user picks a card and sees its shape
next to the typical shape of the predicted label, with the bins the model weighs most highlighted.

- One page (`/`): load predictions (CSV or .xlsx) or use the 25 bundled samples; filter by
  predicted label; searchable/sortable card table; Plotly card viewer with a
  "Compare with" label and an importance overlay; a guide to the 10 labels.
- No review flags or reviewer notes (removed on request to match the artifact).
- `/explorer` (Dynocard Explorer, under Dynocards in the menu) is the same `DynocardReview`
  component with `hierarchyFilter`: cascading Area → Route → Well selects from
  `lib/dynocard/well-hierarchy.ts` (133 wells supplied by the business). Card NodeIDs match
  case-insensitively, ignoring "#" and extra spaces. It also has From / To date filters (no time)
  (whole days; `lib/dynocard/card-time.ts` parses the free-text card Date and compares its day;
  undated cards are hidden only while a date range is set). It also passes `gallery`, which swaps the
  table + single viewer for `CardExplorer`: every card on the page as a full `CardViewer` (own
  "Compare with" and importance toggle), 25/50/100 per page, sticky page-size/paging bar, viewers
  lazily mounted near the viewport. Each card has a top-right × that hides it (later cards move up,
  counts update); "Show N hidden cards" in the sticky bar restores them. No thumbnails, selection
  or overlay (removed on request).
- Left-hand menu (`components/AppSidebar.tsx`, `AppShell.tsx`) with four optimization dashboards
  modelled on the Ambyint/QuickSight screenshots: `/daily` (Daily Dashboard), `/trends`
  (Trend Analysis), `/setpoints` (Setpoint Report), `/review` (Review). Field Summary was not
  built (no screenshot). They read `/api/lift/*`, which serves **generated sample data** from
  `lib/lift/sample.ts` (deterministic, runs to yesterday) until a real SQL source is wired up.
- **Live data (XSPOC):** the Daily Dashboard ends with a "Well Run Status" grid
  (`app/components/lift/WellStatusTable.tsx`) fed by `/api/xspoc/well-status`, which runs the
  business-supplied query in `lib/xspoc/well-status.ts` against `tblNodeMaster`/`tblWellDetails`.
  Run Status is red for "Shutdown…", plain for "Running…", yellow otherwise. Auto-refreshes every
  5 min. It ignores the sample-data controls above it. A "Last scan" filter (default: not updated
  6 hours or more; the only other choice is All wells) plus a "Since Last Scan" column, computed in
  `lib/xspoc/scan-age.ts` from the wall-clock Last Good Scan vs. the viewer's clock.
- **Morning Reports** (`/morning-report`, under Dynocards): the XSPOC "EFD_Morning_Report" grid
  for groups AT1 West/East/Central (query in `lib/xspoc/morning-report.ts`; columns, formatting,
  highlight rules and CSV in `lib/xspoc/morning-report-columns.ts`). Area/Well dropdowns, column
  filter row, Refresh + "Last Refresh" time, optional 5-min auto refresh, Export CSV (current
  filtered view). **6 AM snapshots:** `instrumentation.ts` → `instrumentation-node.ts` starts a
  scheduler that saves the full report to `db/morning-reports/YYYY-MM-DD.json` at 06:00 server
  time; a 5-minute watchdog retries while today's copy is missing (failed attempt, network not
  up after the machine wakes, or 6:00 missed while asleep/stopped), and the first page visit
  also catches up; any copy after 6:15 is flagged "late". On a laptop that sleeps overnight the
  copy can only be taken after it wakes; a true 6:00 copy needs an always-on host (IIS).
  The Report dropdown is "Live" or "6 AM report (latest)", which always shows the newest saved
  copy and polls every minute, so it rolls over to the next morning on its own. "Download 6 AM
  report" downloads the copy being viewed (latest when on Live); the optional per-browser
  "Auto-download at 6 AM" uses the latest. Earlier days are listed under "Earlier 6 AM reports"
  in the same dropdown and stay fixed on that day.
- **Condition tiles from uploads:** an upload on the Classifier or Explorer is published via
  `UploadedPredictionsContext` (well/date/label per card) and the Daily
  Dashboard's 13 condition tiles (`app/components/lift/ConditionTiles.tsx`) are computed from it
  with the business mapping in `lib/dynocard/conditions.ts` (Bad Data = any label but Full Pump;
  Tubing Movement, Worn Traveling Valve and Worn Barrel each feed two tiles). "Show sample cards"
  or "Use default data" returns the tiles and the per-well table to the default: the same **25
  sample cards** the Classifier shows (`/api/cards`, loaded once by `UploadedPredictionsContext`),
  so their links into the Classifier work too. The dashboard's sample daily rows are only a
  fallback if the sample cards can't be read. Clicking a tile opens a
  dropdown of its wells (cards, latest date, model labels). With uploaded data, the dropdown's
  header links to `/?condition=<tile>` (all that condition's cards in the Classifier) and each
  well to `/?condition=<tile>&well=<NodeID>`; `DynocardReview` applies these as a banner filter
  ("Show all cards" clears it). The whole upload (full cards) is kept in the browser's IndexedDB
  (`lib/browser-db.ts`, db `voc-artificial-lift`; localStorage can't hold 10,000 cards), so the
  Dashboard, Classifier and Explorer always show the same file, also after a reload; a small
  localStorage marker (`voc-uploaded-marker`) keeps other open tabs in sync. Browser only,
  never the server.
- The Daily Dashboard ends with "Pump Conditions by Well" (`WellConditionTable.tsx`): one row per
  well with total cards, Full Pump (uploads only) and cards per condition, plus a totals row; same
  source as the tiles (`summarizeByWell` in `lib/dynocard/conditions.ts`). With uploads, each
  number links to that well's cards for that condition in the Classifier.
- Uploads are parsed server-side and returned to the browser; nothing is stored on the server (the only files the
  app writes are the morning-report snapshots).

## Resolved choices

| Item | Value |
| --- | --- |
| App name | VOC Artificial Lift (Dynocard Classifier Review is the `/` page) |
| Base path | `/als` (`NEXT_PUBLIC_BASE_PATH`) |
| Data | `db/sample-cards.json`, `db/model-reference.json` (committed) + CSV/XLSX upload; live XSPOC (SQL Server `VOC-SQL05`, Windows auth, read-only) |
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
- Data connectors in `/lib`, all `import "server-only"`: `excel.ts` (exceljs), `mssql.ts`
  (in use for XSPOC: `SQL_SERVER`/`SQL_DATABASE`/`SQL_AUTH=windows` (optional `SQL_DRIVER`, default ODBC Driver 18) → `msnodesqlv8`
  ODBC driver, `ApplicationIntent=ReadOnly`; `MSSQL_*` SQL-login fallback via tedious),
  `postgres.ts` (pool ready, not used). DATETIME values are wall-clock; format them with
  `sqlDateTimeToText()` (reads UTC parts) so they aren't shifted. Mapbox token helper in `lib/mapbox.ts` (unused).
- Fonts are self-hosted from `@fontsource/*` via `next/font/local` so builds need no internet.
- Vitest (unit, `tests/unit`) and Playwright (e2e, `tests/e2e`, runs the standalone build).
- npm only. Node 20+ (developed on Node 24 LTS).

## Folder structure

```
app/                 routes, layout, loading/error/not-found/global-error
app/api/             cards (GET samples), cards/upload (POST csv/xlsx), model, user, lift/* (dashboards)
app/components/      page components (DynocardReview, CardTable, CardViewer, DynocardPlot, …); lift/ = dashboards
app/contexts/        UserContext.tsx
app/hooks/           useDynocards (data + upload), useCssColor (theme colors for Plotly)
components/          AppShell, AppSidebar, Header, Footer, ThemeProvider, ThemeToggle
components/ui/       shadcn components
db/                  flat data files (only the two sample JSON files are committed)
iis/iisnode.js       iisnode entry point (named-pipe PORT); copied into the standalone build
lib/                 api.ts (basePath helpers), auth.ts, connectors, dynocard/ (parse, geometry, labels), lift/ (sample data, dates, colors)
notes/               Claude-created notes
public/              static files
scripts/             prepare-standalone.mjs (postbuild)
tests/               unit/ (Vitest), e2e/ (Playwright)
types/               shared types
```

## Commands

```
npm run dev          # http://localhost:3000/als
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

Server prerequisites: IIS with Windows Authentication, URL Rewrite, iisnode, Node 20+ on the
system PATH. `scripts/install-iis-app.ps1 -PackagePath <standalone folder>` (run as admin on the
server) does steps 2 and 4 below, sets up the app pool and permissions, and smoke-tests `/api/user`.

1. `npm ci && npm run build` on a machine with the same Node major as the server.
2. Copy `.next/standalone/` to the IIS application folder for `/als`. It contains
   `web.config`, `iisnode.js`, `server.js`, `.next/`, `public/`, `db/` and a trimmed `node_modules`.
3. Put production env vars (`NEXT_PUBLIC_BASE_PATH` is baked in at build time) in IIS / a `.env`
   next to `iisnode.js`.
4. In IIS Manager enable Windows Authentication and disable Anonymous on the application.
5. XSPOC: the server needs ODBC Driver 18 for SQL Server, and the IIS app pool identity (or the
   service account it runs as) needs read access to `XSPOC` on `VOC-SQL05`.
6. Morning-report snapshots: the app pool identity needs write access to `db/morning-reports`
   (or `MORNING_REPORT_DIR`). For an on-time 6:00 capture, keep the app running: app pool
   Start Mode = AlwaysRunning, Idle Time-out = 0, and preload enabled; otherwise the first visit
   after 6:00 captures it late.
   `web.config` promotes `AUTH_USER`/`LOGON_USER`/`REMOTE_USER` to `x-iisnode-*` headers.
