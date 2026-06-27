import { defineConfig, devices } from "@playwright/test";

// Must be deterministic: Playwright evaluates this config in both the main
// process (which starts the web server) and worker processes (which read
// baseURL). Deriving it from process.pid gave them different ports, so workers
// hit a server that wasn't there. Use a fixed port, overridable via env.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 31847);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
  },
  projects: [
    {
      name: "desktop",
      testMatch: /desktop\/.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Pixel 5 uses the Chromium engine, so no extra browser download is needed.
      // Engine-specific iOS behaviours (true dvh / keyboard resize) can't be
      // exercised headless; those specs assert the structural CSS instead.
      name: "mobile",
      testMatch: /mobile\/.*\.spec\.ts$/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
