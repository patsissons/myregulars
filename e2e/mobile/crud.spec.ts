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
    // The sheet header's Add submits the form.
    await sheet.getByRole("button", { name: "Add", exact: true }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByText("Zoe Quartz")).toBeVisible();
  });

  test("add a place via the sheet", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    await page.getByRole("button", { name: "Add a place" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    const addButton = sheet.getByRole("button", { name: "Add", exact: true });
    await expect(addButton).toBeDisabled();
    await sheet.getByLabel("Place name").fill("Riverside Diner");
    await sheet.getByLabel("Description (optional)").fill("Sunday brunch");
    await addButton.click();

    await expect(sheet).toBeHidden();
    await expect(page.getByText("Riverside Diner")).toBeVisible();
    await expect(page.getByText(/Sunday brunch/)).toBeVisible();
  });

  test("log a visit from the person page", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe/p/p-alice`);

    // Quick path: one tap, with feedback and an Undo.
    await page.getByRole("button", { name: "Saw today" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Visit logged" });
    await expect(toast).toBeVisible();
    await expect(toast.getByRole("button", { name: "Undo" })).toBeVisible();
    // Today is now logged, so the primary button becomes a disabled state.
    await expect(page.getByRole("button", { name: "Logged today" })).toBeDisabled();

    // Detailed path: the Log… dialog used to be inert on mobile.
    await page.getByRole("button", { name: "Log…" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Date").fill("2026-06-10");
    await dialog.getByLabel("Note (optional)").fill("Trivia night");
    await dialog.getByRole("button", { name: "Log visit" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("2026-06-10")).toBeVisible();
    await expect(page.getByText("Trivia night")).toBeVisible();
  });

  test("undo restores the previous visit state", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe/p/p-alice`);

    await page.getByRole("button", { name: "Saw today" }).click();
    await page.getByRole("status").getByRole("button", { name: "Undo" }).click();

    await expect(page.getByRole("button", { name: "Saw today" })).toBeEnabled();
    await expect(page.getByRole("status").filter({ hasText: "Visit logged" })).toBeHidden();
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
