import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.describe("opening a vault shows immediate feedback (issue 1)", () => {
  test("the vault card shows a busy state on click, then navigates", async ({ page }) => {
    // Delay the gist read so the loading/pending state is observable.
    await setupVaultApp(page, { gistReadDelayMs: 1500 });

    await page.goto("/vaults");

    const card = page.getByRole("button", { name: /Test Vault/ });
    await expect(card).toBeVisible();

    await card.click();

    // useTransition keeps the card mounted and busy while the route loads.
    await expect(card).toHaveAttribute("aria-busy", "true", { timeout: 10_000 });

    // And it does eventually open the vault.
    await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}`));
    await expect(page.getByRole("heading", { name: "Test Vault" })).toBeVisible();
  });
});
