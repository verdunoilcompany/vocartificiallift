# /db — flat data files

| File | What it is |
| --- | --- |
| `sample-cards.json` | 25 sample downhole cards (well, date, SPM, fillage, predicted label, 50 scaled loads L0–L49). Served by `GET /api/cards`. |
| `model-reference.json` | Classifier metadata: `ref` = typical 50-bin shape per label, `imp` = relative importance (0–1) of each bin. Served by `GET /api/model`. |

Only the files above are committed. Anything else dropped in this folder (e.g. prediction
workbooks read through `lib/excel.ts`) is git-ignored.

## Upload format (CSV or .xlsx, first sheet)

- Required: `L0` … `L49`, and `PredictedLabel` (or `Label`).
- Optional: `NodeID`, `Date`, `SPM`, `Fillage`, and an unnamed first column used as the row number.
- Rows missing any of the 50 loads are skipped.
