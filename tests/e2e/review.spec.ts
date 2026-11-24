import { expect, test } from "@playwright/test";

// These run against live MLDB (ML_SQL_* in .env), so counts aren't fixed; check behaviour.

test("loads MLDB cards, the signed-in user and a chart", async ({ page }) => {
  await page.goto("./dynocard-classifier");
  await expect(page.getByRole("heading", { level: 1, name: "Dynocard Classifier Review" })).toBeVisible();
  await expect(page.getByTestId("username")).toHaveText("e2e-user");
  await expect(page.getByTestId("status")).toHaveText(/Loaded [\d,]+ cards · \d+ wells?/, { timeout: 60_000 });
  await expect(page.getByTestId("dynocard-plot").locator(".main-svg").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "The 10 labels the model can predict" })).toBeVisible();
  // No upload or sample buttons any more.
  await expect(page.getByText(/Load predictions|Show sample cards/)).toHaveCount(0);
});

test("filters by label and selects a card", async ({ page }) => {
  await page.goto("./dynocard-classifier");
  await expect(page.getByTestId("status")).toHaveText(/Loaded/, { timeout: 60_000 });
  await page.getByRole("button", { name: /^Full Pump/ }).click();
  const rows = page.locator("tbody tr[data-row-id]");
  await rows.nth(0).click();
  await expect(page.getByTestId("predicted-label")).toHaveText("Full Pump");
});

test("keeps all wells within 14 days", async ({ page }) => {
  await page.goto("./dynocard-classifier");
  await expect(page.getByTestId("status")).toHaveText(/Loaded/, { timeout: 60_000 });
  await expect(page.getByTestId("classifier-range-hint")).toHaveText(
    "All wells: you can select up to 14 days.",
  );
  // Typing a From date far back moves the To date so the range stays at 14 days.
  await page.getByTestId("classifier-range-from").fill("2026-01-01");
  await expect(page.getByTestId("classifier-range-to")).toHaveValue("2026-01-14");
});
