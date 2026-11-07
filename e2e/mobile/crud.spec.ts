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

  test("log a visit from the person page", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe/p/p-alice`);

    // Quick path: one tap, with feedback.
    await page.getByRole("button", { name: "Saw today" }).click();
    await expect(page.getByRole("status")).toContainText("Visit logged");

    // Detailed path: the Log… dialog used to be inert on mobile.
    await page.getByRole("button", { name: "Log…" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Date").fill("2026-06-10");
    await dialog.getByLabel("Note (optional)").fill("Trivia night");
    await dialog.getByRole("button", { name: "Log visit" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("2026-06-10").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Trivia night").filter({ visible: true }).first()).toBeVisible();
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
