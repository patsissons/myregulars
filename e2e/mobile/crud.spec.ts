import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test.describe("mobile CRUD journeys", () => {
  test("add a person via the bottom sheet", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);

    await page.getByRole("button", { name: "Add person" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder("Name", { exact: true }).fill("Zoe Quartz");
    await sheet.getByRole("button", { name: "Add person" }).click();

    await expect(page.getByText("Zoe Quartz").filter({ visible: true }).first()).toBeVisible();
  });

  test("add a place via the prompt", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    page.once("dialog", (dialog) => dialog.accept("Riverside Diner"));
    await page.getByRole("button", { name: "Add a place" }).click();

    // The hidden desktop sidebar also lists places; assert the visible mobile one.
    await expect(page.getByText("Riverside Diner").filter({ visible: true }).first()).toBeVisible();
  });

  test("rename a place from the header menu", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);

    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Rename place" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Place name").fill("Cafe Renamed");
    await dialog.getByRole("button", { name: "Rename" }).click();

    await expect(page.getByRole("heading", { name: "Cafe Renamed" })).toBeVisible();
  });
});
