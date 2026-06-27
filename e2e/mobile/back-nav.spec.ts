import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test("mobile back button loads the previous page, not a stale one (issue 5)", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);

  // vault home → place
  await page
    .getByRole("button", { name: /Blue Bottle/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();

  // place → person
  await page
    .getByRole("button", { name: /Alice Baker/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/p\/p-alice$/);
  await expect(page.getByRole("button", { name: "Saw today" })).toBeVisible();

  // back → place (URL AND content must actually be the place, not the person)
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/l\/loc-cafe$/);
  await expect(page.getByRole("heading", { name: "Blue Bottle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saw today" })).toHaveCount(0);

  // back → vault home
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
  await expect(page.getByRole("searchbox", { name: "Search vault" })).toBeVisible();
});
