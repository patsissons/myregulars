import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test.describe("desktop CRUD journeys", () => {
  test("add a place from the sidebar", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    await page.getByRole("button", { name: "New place" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("The Café Around the Corner").fill("Riverside Diner");
    await dialog.getByRole("button", { name: "Add place" }).click();

    await expect(page.getByRole("button", { name: /Riverside Diner/ }).first()).toBeVisible();
  });

  test("add a person to a place", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);

    await page.getByRole("button", { name: "Add person" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Name", { exact: true }).fill("Zoe Quartz");
    await dialog.getByRole("button", { name: "Add person" }).click();

    // The same person renders in both desktop and (hidden) mobile markup.
    await expect(page.getByText("Zoe Quartz").filter({ visible: true }).first()).toBeVisible();
  });

  test("log a visit from the person rail", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe/p/p-alice`);

    await page.getByRole("button", { name: "Saw today" }).click();
    await expect(page.getByText("Visit logged")).toBeVisible();
  });

  test("rename the vault from the top-bar menu", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Rename vault" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Vault name").fill("Renamed Vault");
    await dialog.getByRole("button", { name: "Rename" }).click();

    await expect(page.getByText("Renamed Vault").first()).toBeVisible();
  });
});
