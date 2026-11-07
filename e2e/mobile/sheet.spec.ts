import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test.describe("add-person sheet (issues 10, 11)", () => {
  test("opens with the name field focused and visible", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);

    await page.getByRole("button", { name: "Add person" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Add a person")).toBeVisible();

    const nameInput = dialog.getByPlaceholder("Name", { exact: true });
    await expect(nameInput).toBeVisible();

    // The name field is focused after open (issue 11: no jump to the bottom).
    await expect
      .poll(() =>
        page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.placeholder),
      )
      .toBe("Name");

    // The name field is within the viewport (not scrolled past). Poll: the
    // sheet is still sliding in when focus lands.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    await expect
      .poll(async () => {
        const box = await nameInput.boundingBox();
        return box ? box.y >= 0 && box.y + box.height <= (viewport?.height ?? 0) : false;
      })
      .toBe(true);
  });

  test("the sheet body is a scroll container sized to the dynamic viewport (issue 10)", async ({
    page,
  }) => {
    await page.goto(`/v/${GIST_ID}/l/loc-cafe`);
    await page.getByRole("button", { name: "Add person" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The sheet caps its height to the dynamic viewport so it stays above the
    // keyboard, and its body scrolls.
    const maxHeightPx = await dialog.evaluate((el) => parseFloat(getComputedStyle(el).maxHeight));
    expect(maxHeightPx).toBeGreaterThan(0);
    expect(maxHeightPx).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));

    const hasScrollableBody = await dialog.evaluate((el) =>
      Array.from(el.querySelectorAll("div")).some((d) => getComputedStyle(d).overflowY === "auto"),
    );
    expect(hasScrollableBody).toBe(true);
  });
});
