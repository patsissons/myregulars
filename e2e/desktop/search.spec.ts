import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test.describe("desktop vault search", () => {
  test("typing finds a person and navigates to them", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    const search = page.getByRole("searchbox", { name: "Search vault" }).first();
    await search.fill("Carlos");

    // Scope to the search-results dropdown (a person also appears in "Recent people").
    const result = page
      .getByRole("listbox", { name: "Search results" })
      .getByRole("button", { name: /Carlos Diaz/ });
    await expect(result).toBeVisible();
    await result.click();

    await expect(page).toHaveURL(/\/l\/loc-cafe\/p\/p-carlos$/);
  });

  test("Cmd/Ctrl+K focuses the search field", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    const search = page.getByRole("searchbox", { name: "Search vault" }).first();
    await expect(search).not.toBeFocused();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(search).toBeFocused();
  });
});
