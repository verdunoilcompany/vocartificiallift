import { LOAD_BINS, type DynaCard } from "@/types/dynacard";
import { NO_PREDICTION } from "./labels";

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF/LF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1);
}

export class CardParseError extends Error {}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Converts a header + data grid (from CSV or Excel) into cards.
 *
 * Required columns: L0…L49 and PredictedLabel (or Label).
 * Optional: NodeID, Date, SPM, Fillage, and an unnamed first column used as the row number.
 * Rows missing any of the 50 loads are skipped.
 */
export function rowsToCards(rows: string[][]): DynaCard[] {
  if (rows.length === 0) throw new CardParseError("The file is empty.");

  const head = rows[0].map((h) => h.trim());
  const ix = (name: string) => head.indexOf(name);

  const loadIx = Array.from({ length: LOAD_BINS }, (_, k) => ix(`L${k}`));
  if (loadIx.some((i) => i < 0)) throw new CardParseError("The file needs columns L0 to L49.");

  const labelIx = ix("PredictedLabel") >= 0 ? ix("PredictedLabel") : ix("Label");
  if (labelIx < 0) throw new CardParseError("The file needs a PredictedLabel column.");

  const rowIx = ix("");
  const nodeIx = ix("NodeID");
  const dateIx = ix("Date");
  const spmIx = ix("SPM");
  const fillIx = ix("Fillage");

  const num = (r: string[], i: number) => {
    const v = i >= 0 ? parseFloat(r[i]) : NaN;
    return Number.isFinite(v) ? round1(v) : null;
  };

  const out: DynaCard[] = [];
  rows.slice(1).forEach((r, k) => {
    const L = loadIx.map((i) => parseFloat(r[i]));
    if (L.some((v) => !Number.isFinite(v))) return;
    const row = rowIx >= 0 && r[rowIx] !== "" && r[rowIx] != null ? r[rowIx] : k;
    const node = nodeIx >= 0 && r[nodeIx] ? r[nodeIx] : `Card ${k}`;
    out.push({
      id: `${row}|${node}|${k}`,
      row,
      node,
      date: dateIx >= 0 ? (r[dateIx] ?? "") : "",
      spm: num(r, spmIx),
      fill: num(r, fillIx),
      label: r[labelIx]?.trim() || NO_PREDICTION,
      L,
    });
  });

  if (!out.length) throw new CardParseError("No rows with all 50 loads were found.");
  return out;
}
