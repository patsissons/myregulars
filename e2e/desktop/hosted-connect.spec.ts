import { test, expect } from "@playwright/test";

// Verifies the hosted ("Hosted vault") connect surface end-to-end. The dev
// server runs with NEXT_PUBLIC_POCKETBASE_URL set (see playwright.config.ts),
// so the hosted provider is offered. No real PocketBase instance is needed —
// we only assert the social-login entry points render, not the OAuth round-trip.
test.describe("hosted vault connect", () => {
  test("offers GitHub Gists and the hosted social logins", async ({ page }) => {
    await page.goto("/connect");

    // Both providers are listed.
    await expect(page.getByRole("button", { name: /GitHub Gists/ })).toBeVisible();
    const hostedRow = page.getByRole("button", { name: /Hosted vault/ });
    await expect(hostedRow).toBeVisible();

    // Expanding the hosted row reveals the supported social logins (incl. GitHub).
    await hostedRow.click();

    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
    for (const label of ["Google", "Apple", "Meta", "X"]) {
      await expect(page.getByRole("button", { name: `Continue with ${label}` })).toBeVisible();
    }
  });
});
