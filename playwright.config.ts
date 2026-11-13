import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/dynocard";
const port = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}${basePath}/`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Runs the production standalone build; run `npm run build` first.
    command: `node .next/standalone/server.js`,
    url: `http://localhost:${port}${basePath}/api/cards`,
    env: { PORT: String(port), HOSTNAME: "localhost", AUTH_USER: "e2e-user" },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
