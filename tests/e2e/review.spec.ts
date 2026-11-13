import { expect, test } from "@playwright/test";

const loadCols = Array.from({ length: 50 }, (_, i) => `L${i}`);

test("shows sample cards, the signed-in user and a chart", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Dynacard Classifier Review" })).toBeVisible();
  await expect(page.getByTestId("username")).toHaveText("e2e-user");
  await expect(page.getByTestId("status")).toHaveText("Showing 25 sample cards.");
  await expect(page.getByTestId("dynacard-plot").locator(".main-svg").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "The 10 labels the model can predict" })).toBeVisible();
});

test("filters by label and selects a card", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Fluid Pound/ }).click();
  const rows = page.locator("tbody tr[data-row-id]");
  await expect(rows).toHaveCount(4);
  await rows.nth(1).click();
  await expect(page.getByTestId("predicted-label")).toHaveText("Fluid Pound");
});

test("loads an uploaded CSV", async ({ page }) => {
  await page.goto("./");
  const header = ["NodeID", "PredictedLabel", ...loadCols].join(",");
  const row = (name: string, label: string) =>
    [name, label, ...loadCols.map((_, i) => (i < 25 ? 0.9 : 0.05))].join(",");
  const csv = [header, row("Test 1H", "Full Pump"), row("Test 2H", "Gas Interference")].join("\n");
  await page.getByTestId("file-input").setInputFiles({
    name: "predictions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByTestId("status")).toHaveText("Loaded 2 cards from predictions.csv.");
  await expect(page.locator("tbody tr[data-row-id]")).toHaveCount(2);
});

test("rejects a CSV without load columns", async ({ page }) => {
  await page.goto("./");
  await page.getByTestId("file-input").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("NodeID,PredictedLabel\nA,Full Pump\n"),
  });
  await expect(page.getByText("The file needs columns L0 to L49.")).toBeVisible();
  await expect(page.getByTestId("status")).toHaveText("Showing 25 sample cards.");
});
