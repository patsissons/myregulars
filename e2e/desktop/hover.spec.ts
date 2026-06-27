import { expect, test, type Locator } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

function bgColor(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).backgroundColor);
}

test.describe("desktop hover affordances (issue 2)", () => {
  test("sidebar place rows gain a background on hover", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    const row = page.getByRole("button", { name: /Blue Bottle/ }).first();
    await expect(row).toBeVisible();

    const before = await bgColor(row);
    await row.hover();
    await expect(async () => {
      expect(await bgColor(row)).not.toBe(before);
    }).toPass();
  });

  test("transparent secondary buttons gain a background on hover", async ({ page }) => {
    await page.goto(`/v/${GIST_ID}`);

    // Open the New place modal to reach a secondary (transparent) Button.
    await page.getByRole("button", { name: "New place" }).click();
    const cancel = page.getByRole("button", { name: "Cancel" });
    await expect(cancel).toBeVisible();

    // Secondary variant starts transparent.
    expect(await bgColor(cancel)).toBe("rgba(0, 0, 0, 0)");

    await cancel.hover();
    await expect(async () => {
      expect(await bgColor(cancel)).not.toBe("rgba(0, 0, 0, 0)");
    }).toPass();
  });
});
