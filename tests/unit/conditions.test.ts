import { describe, expect, it } from "vitest";
import {
  cardMatches,
  summarizeByWell,
  summarizePredictions,
  type PredictionCard,
} from "@/lib/dynocard/conditions";

const card = (
  node: string,
  label: string,
  date: string | null = "2025-05-15 10:00",
): PredictionCard => ({
  node,
  date,
  label,
});

describe("condition mapping", () => {
  it("follows the agreed table", () => {
    expect(cardMatches("Card Distortion", "Tubing Movement")).toBe(true);
    expect(cardMatches("Plunger Undertravel", "Tubing Movement")).toBe(true);
    expect(cardMatches("Deep Rod Part", "Stuck Piston")).toBe(true);
    expect(
      cardMatches("Delayed Travelling Valve", "Worn Traveling Valve"),
    ).toBe(true);
    expect(cardMatches("Hole in Tubing", "Worn Traveling Valve")).toBe(true);
    expect(cardMatches("Hole in Barrel", "Worn Barrel")).toBe(true);
    expect(cardMatches("Worn Pump", "Worn Barrel")).toBe(true);
    expect(cardMatches("Stuck Pump", "Sticking Pump")).toBe(true);
    expect(cardMatches("SV Stuck Pump", "Worn Standing Valve")).toBe(true);
    expect(cardMatches("Tagging", "Pump Hitting Down")).toBe(true);
    expect(cardMatches("Fluid Pound", " fluid pound ")).toBe(true);
    expect(cardMatches("Gas Interference", "Gas Interference")).toBe(true);
    expect(cardMatches("Worn Pump", "Worn Standing Valve")).toBe(false);
  });

  it("Bad Data is any predicted label other than Full Pump", () => {
    expect(cardMatches("Bad Data", "Fluid Pound")).toBe(true);
    expect(cardMatches("Bad Data", "Full Pump")).toBe(false);
    expect(cardMatches("Bad Data", "No prediction")).toBe(false);
  });
});

describe("summarizePredictions", () => {
  const cards = [
    card("Well A", "Gas Interference", "2025-05-15 08:00"),
    card("Well A", "Gas Interference", "2025-05-15 10:00"),
    card("Well B", "Gas Interference"),
    card("Well B", "Worn Barrel"),
    card("Well C", "Full Pump"),
    card("Well D", "No prediction"),
  ];
  const s = Object.fromEntries(
    summarizePredictions(cards).map((x) => [x.condition, x]),
  );

  it("counts wells and % of predicted cards", () => {
    expect(s["Gas Interference"].wells.map((w) => w.well)).toEqual([
      "Well A",
      "Well B",
    ]);
    expect(s["Gas Interference"].cardCount).toBe(3);
    expect(s["Gas Interference"].pct).toBe(60); // 3 of 5 predicted cards
    expect(s["Gas Interference"].wells[0]).toMatchObject({
      cards: 2,
      lastDate: "2025-05-15 10:00",
    });
  });

  it("counts a two-category label in both tiles", () => {
    expect(s["Hole in Barrel"].wells.map((w) => w.well)).toEqual(["Well B"]);
    expect(s["Worn Pump"].wells.map((w) => w.well)).toEqual(["Well B"]);
  });

  it("Bad Data lists every well with a non-Full-Pump card", () => {
    expect(s["Bad Data"].wells.map((w) => w.well)).toEqual([
      "Well A",
      "Well B",
    ]);
    expect(s["Bad Data"].cardCount).toBe(4);
    expect(s["Bad Data"].wells[1].labels).toEqual([
      "Gas Interference",
      "Worn Barrel",
    ]);
    expect(s["Tagging"].wells).toEqual([]);
  });
});

describe("summarizeByWell", () => {
  it("counts each well's cards per condition", () => {
    const rows = summarizeByWell([
      card("Well B", "Worn Barrel"),
      card("Well A", "Full Pump"),
      card("Well A", "Fluid Pound"),
      card("Well A", "Fluid Pound"),
      card("Well A", "No prediction"),
    ]);
    expect(rows.map((r) => r.well)).toEqual(["Well A", "Well B"]);
    const [a, b] = rows;
    expect(a).toMatchObject({ totalCards: 4, fullPump: 1 });
    expect(a.counts["Fluid Pound"]).toBe(2);
    expect(a.counts["Bad Data"]).toBe(2);
    expect(b.counts["Hole in Barrel"]).toBe(1);
    expect(b.counts["Worn Pump"]).toBe(1);
    expect(b.counts["Bad Data"]).toBe(1);
    expect(b.counts["Gas Interference"]).toBe(0);
  });
});
