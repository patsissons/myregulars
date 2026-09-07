import { expect, test, type Route } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test("browser back commits immediately even when the RSC fetch stalls", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);

  // vault home → place → person
  await page
    .getByRole("button", { name: /Blue Bottle/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await page
    .getByRole("button", { name: /Alice Baker/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/p\/p-alice$/);
  await expect(page.getByRole("button", { name: "Saw today" })).toBeVisible();

  // Reload to clear the in-memory client router cache while keeping history —
  // the state a tab is in after iOS Safari evicts and restores it.
  await page.reload();
  await expect(page.getByRole("button", { name: "Saw today" })).toBeVisible();

  // Stall all router (RSC) fetches, simulating a dead connection after a
  // long-idle resume on mobile.
  let stalled = true;
  const held: Route[] = [];
  await page.route("**/*", async (route) => {
    const isRscFetch = (await route.request().headerValue("rsc")) !== null;
    if (stalled && isRscFetch) {
      held.push(route);
      return;
    }
    return route.fallback();
  });

  // Real history traversal (the in-app Back button uses router.back() but the
  // iOS edge swipe is a browser-level traversal).
  await page.goBack();

  // The URL must commit right away, and the visible content must leave the
  // person page (the stuck-navigation watchdog hard-reloads within ~3s)
  // instead of freezing on stale content until a manual reload.
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("button", { name: "Saw today" })).toHaveCount(0, { timeout: 7_500 });
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();

  stalled = false;
  for (const route of held.splice(0)) {
    // Routes from before the recovery reload are already disposed.
    await route.fallback().catch(() => {});
  }
});

test("back after the auth redirect leaves the app instead of bouncing", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();

  // Authenticated visit to / redirects to /vaults (via replace, consuming the
  // / history entry).
  await page.goto("/");
  await expect(page).toHaveURL(/\/vaults$/);

  // Back must land on /connect and stay there — with push-based redirects the
  // / entry immediately bounces forward to /vaults again.
  await page.goBack();
  await expect(page).toHaveURL(/\/connect$/);
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/connect$/);
});
