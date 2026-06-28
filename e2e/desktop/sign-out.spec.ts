import { test, expect } from "@playwright/test";
import { setupVaultApp } from "../support";

// The /vaults header lists connected providers with a Sign out action.
// Signing out of the only connected provider returns to onboarding.
test.describe("sign out", () => {
  test("signing out of GitHub clears the session and returns to onboarding", async ({ page }) => {
    await setupVaultApp(page);
    await page.goto("/vaults");

    await expect(page.getByText("github.com/testuser")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByRole("button", { name: /Connect with GitHub/ })).toBeVisible();
  });
});
