import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test.describe("desktop vault overview", () => {
  test("vault root shows an overview instead of redirecting into a place (issue 3)", async ({
    page,
  }) => {
    await page.goto(`/v/${GIST_ID}`);

    // Stays on the vault root (no redirect to /l/...).
    await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));

    // Overview content. Name/counts/recent-people appear in both the desktop
    // overview and the (display:none) mobile markup, so target the first.
    await expect(page.getByRole("heading", { name: "Test Vault" }).first()).toBeVisible();
    await expect(page.getByText("2 places · 3 people").first()).toBeVisible();
    await expect(page.getByText("Recent people").first()).toBeVisible();
    // Unique to the desktop overview.
    await expect(page.getByText("Select a place from the sidebar")).toBeVisible();
  });

  test("the top-bar logo/title returns to the overview from a place (issue 3)", async ({
    page,
  }) => {
    await page.goto(`/v/${GIST_ID}`);

    // Enter a place from the sidebar.
    await page
      .getByRole("button", { name: /Blue Bottle/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/l\/loc-cafe$/);

    // Click the clickable vault-home button in the top bar.
    await page.getByRole("button", { name: "Vault overview" }).click();
    await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
    await expect(page.getByText("Select a place from the sidebar")).toBeVisible();
  });

  test("the decorative traffic-light dots are gone (issue 4)", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);
    await expect(page.getByRole("button", { name: "Vault overview" })).toBeVisible();

    // The removed dots used these exact inline background colors.
    for (const color of ["#ff5f57", "#febc2e", "#28c840"]) {
      await expect(page.locator(`[style*="${color}"]`)).toHaveCount(0);
    }
  });
});
