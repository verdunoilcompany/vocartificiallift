# Migration notes: HTML prototype → Next.js

Source: the "Dynocard Classifier Review" single-file HTML artifact (embedded 25 sample cards,
per-label reference shapes and per-bin importance, inline SVG chart, CSV loader).

## Kept as-is
- Sample cards, reference shapes, importance weights (extracted verbatim into `/db`).
- Bin position math (100 up + 100 down samples, averaged in fours) → `lib/dynacard/geometry.ts`.
- Label descriptions, CSV column contract (L0–L49, PredictedLabel/Label, NodeID, Date, SPM,
  Fillage, unnamed row column), one-decimal rounding of SPM/fillage.
- Viewer behavior: compare selector defaults to the card's own label (Full Pump if no reference),
  importance overlay for bins with importance > 0.55, label filter chips, "Needs review" chip.

## Changed
- The prototype defined review heuristics (`autoNote`) but never applied them, and blanked the
  hand-written notes on the samples, so "Needs review" never appeared. The app now applies the
  heuristics to samples and uploads, so 3 of the 25 samples are flagged.
- Uploads accept .xlsx as well as CSV and are parsed on the server (exceljs stays server-only).
- Card list is a TanStack table with search and sorting; arrow keys move the selection.
- Chart is Plotly (hover values, zoom) instead of hand-built SVG; label-guide thumbnails stay SVG.
- Responses that arrive out of order can't overwrite newer data (an upload made while the samples
  are still loading wins).
