import { test, expect } from "@playwright/test";
import { setupVaultApp } from "../support";

// A GitHub-authed user must still be able to create a hosted (PocketBase) vault.
// The New-vault modal should offer a provider choice and, when "Hosted vault"
// is picked without a hosted session, prompt to sign in inline. (PocketBase is
// not running in e2e, so HostedAuthButtons falls back to the supported list.)
test.describe("hosted vault creation path", () => {
  test("a GitHub-authed user can choose Hosted vault and is prompted to sign in", async ({
    page,
  }) => {
    await setupVaultApp(page);
    await page.goto("/vaults");

    await page.getByRole("button", { name: "New vault" }).click();

    // Both providers are offered.
    await expect(page.getByRole("button", { name: "GitHub Gist" })).toBeVisible();
    const hostedToggle = page.getByRole("button", { name: "Hosted vault" });
    await expect(hostedToggle).toBeVisible();

    // Choosing hosted (no hosted session yet) reveals an inline sign-in.
    await hostedToggle.click();
    await expect(page.getByText(/Sign in to a hosted account/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  });
});
