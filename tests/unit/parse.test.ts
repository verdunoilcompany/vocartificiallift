import { describe, expect, it } from "vitest";
import { CardParseError, parseCsv, rowsToCards } from "@/lib/dynacard/parse";

const loads = (v: number) => Array.from({ length: 50 }, () => v);
const header = ["", "NodeID", "Date", "SPM", "Fillage", "PredictedLabel", ...loads(0).map((_, i) => `L${i}`)];

describe("parseCsv", () => {
  it("handles quoted fields, escaped quotes and CRLF", () => {
    const rows = parseCsv('a,b,c\r\n"x, y","he said ""hi""",3\r\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["x, y", 'he said "hi"', "3"],
    ]);
  });

  it("keeps the last row without a trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("rowsToCards", () => {
  it("maps columns and rounds SPM/fillage to one decimal", () => {
    const rows = [header, ["7", "Well 1H", "2025-05-15 10:40", "2.94", "82.76", "Fluid Pound", ...loads(0.5).map(String)]];
    const [card] = rowsToCards(rows);
    expect(card).toMatchObject({ row: "7", node: "Well 1H", spm: 2.9, fill: 82.8, label: "Fluid Pound" });
    expect(card.L).toHaveLength(50);
  });

  it("falls back to Label and fills defaults", () => {
    const h = ["Label", ...loads(0).map((_, i) => `L${i}`)];
    const [card] = rowsToCards([h, ["", ...loads(0.1).map(String)]]);
    expect(card.label).toBe("No prediction");
    expect(card.node).toBe("Card 0");
    expect(card.spm).toBeNull();
  });

  it("skips rows with missing loads", () => {
    const bad = ["1", "W", "", "", "", "Full Pump", ...loads(0.5).map(String)];
    bad[10] = "";
    const good = ["2", "W2", "", "", "", "Full Pump", ...loads(0.5).map(String)];
    expect(rowsToCards([header, bad, good]).map((c) => c.node)).toEqual(["W2"]);
  });

  it("rejects files without the load columns or a label column", () => {
    expect(() => rowsToCards([["NodeID", "PredictedLabel"]])).toThrow(CardParseError);
    expect(() => rowsToCards([loads(0).map((_, i) => `L${i}`)])).toThrow(/PredictedLabel/);
  });
});
