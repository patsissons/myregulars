import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test("mobile vault search finds and opens a person (issue 6)", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);

  // The mobile search is a real searchbox now, not a display-only pill.
  const search = page.getByRole("searchbox", { name: "Search vault" });
  await expect(search).toBeVisible();

  await search.fill("Alice");

  const result = page.getByRole("button", { name: /Alice Baker/ });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/l\/loc-cafe\/p\/p-alice$/);
  await expect(page.getByRole("heading", { name: "Alice Baker" })).toBeVisible();
});
