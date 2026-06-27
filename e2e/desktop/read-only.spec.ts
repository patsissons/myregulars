import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

// Authenticate as someone other than the gist owner → read-only vault.
test.beforeEach(async ({ page }) => {
  await setupVaultApp(page, { authLogin: "someone-else" });
});

test.describe("read-only vault", () => {
  test("shows the read-only banner with a clone CTA", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);
    await expect(page.getByText(/Read-only vault/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Clone to your vault" })).toBeVisible();
  });

  test("hides editing affordances", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);
    // No "New place" in the sidebar when read-only.
    await expect(page.getByRole("button", { name: "New place" })).toHaveCount(0);

    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);
    await expect(page.getByRole("heading", { name: "Blue Bottle" }).first()).toBeVisible();
    // No "Add person" button when read-only.
    await expect(page.getByRole("button", { name: "Add person" })).toHaveCount(0);
  });
});
