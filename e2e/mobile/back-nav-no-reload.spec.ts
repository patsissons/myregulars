import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

// The app is one route: in-app navigation is pushState and back/forward is a
// store update, so traversal must never need the server (no RSC fetch) and
// must never fall back to a reload.

declare global {
  interface Window {
    __mrBoot?: number;
  }
}

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
  // A fresh document gets a new boot stamp; it must survive every traversal.
  await page.addInitScript(() => {
    window.__mrBoot = window.__mrBoot ?? Date.now() + Math.random();
  });
});

async function bootStamp(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.__mrBoot);
}

test("back/forward through the vault commits instantly, with no server fetch and no reload", async ({
  page,
}) => {
  await page.goto(`/v/${GIST_ID}`);
  const boot = await bootStamp(page);

  // vault home → place → person
  await page.getByRole("button", { name: /Blue Bottle/ }).click();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await page.getByRole("button", { name: /Alice Baker/ }).click();
  await expect(page).toHaveURL(/\/p\/p-alice$/);
  await expect(page.getByRole("button", { name: "Saw today" })).toBeVisible();

  // From here on, every server round-trip is a failure.
  const serverRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isRsc = (await request.headerValue("rsc")) !== null;
    const isDocument = request.resourceType() === "document";
    if (isRsc || isDocument) serverRequests.push(`${isRsc ? "rsc" : "document"} ${url.pathname}`);
    return route.fallback();
  });

  await page.goBack();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saw today" })).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();

  expect(serverRequests).toEqual([]);
  expect(await bootStamp(page)).toBe(boot);
});

test("back into a vault from the vault list is instant with the network gone", async ({ page }) => {
  // Start on the list so the vault sits on top of it in history: Back is then
  // a real traversal (a deep-linked vault would replace itself with the list
  // instead, leaving nothing to go forward to).
  await page.goto("/vaults");
  await expect(page.getByRole("heading", { name: "Your vaults" })).toBeVisible();
  const boot = await bootStamp(page);

  await page.getByRole("button", { name: /Test Vault/ }).click();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();

  await page.getByRole("button", { name: "Back to vaults" }).click();
  await expect(page).toHaveURL(/\/vaults$/);
  await expect(page.getByRole("heading", { name: "Your vaults" })).toBeVisible();

  // Kill every network request, including the gist API.
  await page.route("**/*", (route) => route.abort());

  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();
  await expect(page.getByText(/Blue Bottle/).first()).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/vaults$/);
  await expect(page.getByRole("heading", { name: "Your vaults" })).toBeVisible();

  expect(await bootStamp(page)).toBe(boot);
});

test("a deep link's Back goes up a level instead of leaving the app", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}/l/loc-cafe/p/p-alice`);
  await expect(page.getByRole("button", { name: "Saw today" })).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();
});

test("the system Back gesture closes an open sheet and stays on the screen", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}/l/loc-cafe`);

  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();
});

test("a share link opens the vault and Back leaves cleanly", async ({ page }) => {
  await page.goto(`/?gist=${GIST_ID}`);
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();

  // The landing entry was replaced, so there is nothing to bounce back to.
  await page.getByRole("button", { name: "Back to vaults" }).click();
  await expect(page).toHaveURL(/\/vaults$/);
});

test("a historical version link keeps ?version= while drilling in", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}?version=1abcdef1abcdef1abcdef1abcdef1abcdef1abcd`);
  await expect(page.getByText(/Viewing version 1abcdef/)).toBeVisible();

  await page.getByRole("button", { name: /Blue Bottle/ }).click();
  await expect(page).toHaveURL(/\/l\/loc-cafe\?version=1abcdef/);
  await expect(page.getByText(/Viewing version 1abcdef/)).toBeVisible();
});

test("back after the auth redirect leaves the app instead of bouncing", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();

  // Authenticated visit to / redirects to /vaults (via replace, consuming the
  // / history entry).
  await page.goto("/");
  await expect(page).toHaveURL(/\/vaults$/);

  // Back must land on /connect and stay there.
  await page.goBack();
  await expect(page).toHaveURL(/\/connect$/);
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/connect$/);
});
