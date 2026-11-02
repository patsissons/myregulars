import { defineConfig, devices } from "@playwright/test";

// Must be deterministic: Playwright evaluates this config in both the main
// process (which starts the web server) and worker processes (which read
// baseURL). Deriving it from process.pid gave them different ports, so workers
// hit a server that wasn't there. Use a fixed port, overridable via env.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 31847);

// Default to a production build: that is what users run, and `next dev`
// compiles routes lazily, which produced spurious 404s mid-suite. Set
// PLAYWRIGHT_DEV=1 to iterate against the dev server locally.
const useDevServer = process.env.PLAYWRIGHT_DEV === "1";

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
      name: "mobile",
      testMatch: /mobile\/.*\.spec\.ts$/,
      use: { ...devices["Pixel 5"] },
    },
    {
      // WebKit is the engine behind every iOS browser; most users are there.
      name: "mobile-webkit",
      testMatch: /mobile\/.*\.spec\.ts$/,
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: useDevServer
      ? `npx next dev -p ${port}`
      : `npx next build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 300_000,
    // Enable the hosted (PocketBase) provider UI. No PocketBase instance is
    // started; specs only exercise the client-side connect surface, and the
    // hosted discovery path no-ops without a signed-in account.
    env: { NEXT_PUBLIC_POCKETBASE_URL: "http://127.0.0.1:8090" },
  },
});
