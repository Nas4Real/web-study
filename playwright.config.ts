import { randomUUID } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const e2eAuthToken = process.env.WEB_STUDY_E2E_AUTH_TOKEN ?? randomUUID();
process.env.WEB_STUDY_E2E_AUTH_TOKEN = e2eAuthToken;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    extraHTTPHeaders: {
      "x-web-study-e2e-auth": e2eAuthToken,
    },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3100",
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3100",
      WEB_STUDY_E2E_AUTH_TOKEN: e2eAuthToken,
    },
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
