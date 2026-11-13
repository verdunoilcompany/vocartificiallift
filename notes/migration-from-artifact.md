# Migration notes: HTML prototype → Next.js

Source: the "Dynocard Classifier Review" single-file HTML artifact (embedded 25 sample cards,
per-label reference shapes and per-bin importance, inline SVG chart, CSV loader).

## Kept as-is
- Sample cards, reference shapes, importance weights (extracted verbatim into `/db`).
- Bin position math (100 up + 100 down samples, averaged in fours) → `lib/dynacard/geometry.ts`.
- Label descriptions, CSV column contract (L0–L49, PredictedLabel/Label, NodeID, Date, SPM,
  Fillage, unnamed row column), one-decimal rounding of SPM/fillage.
- Viewer behavior: compare selector defaults to the card's own label (Full Pump if no reference),
  importance overlay for bins with importance > 0.55, label filter chips.

## Changed
- Review flags / reviewer notes are not shown, matching the artifact (whose review heuristics
  were never applied and whose sample notes were blanked). An earlier version of this app turned
  them on; that was removed on request.
- Uploads accept .xlsx as well as CSV and are parsed on the server (exceljs stays server-only).
- Card list is a TanStack table with search and sorting; arrow keys move the selection.
- Chart is Plotly (hover values, zoom) instead of hand-built SVG; label-guide thumbnails stay SVG.
- Responses that arrive out of order can't overwrite newer data (an upload made while the samples
  are still loading wins).
