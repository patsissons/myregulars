import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

declare global {
  interface Window {
    __shared?: { title?: string; text?: string; url?: string };
  }
}

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

test("Share uses the native share sheet when the browser has one", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: { title?: string; text?: string; url?: string }) => {
        window.__shared = data;
        return Promise.resolve();
      },
    });
  });

  await page.goto(`/v/${GIST_ID}`);
  await page.getByRole("button", { name: "Share vault" }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Share…" }).click();

  const shared = await page.evaluate(() => window.__shared);
  expect(shared?.title).toBe("Test Vault");
  expect(shared?.url).toMatch(new RegExp(`\\?gist=${GIST_ID}$`));

  // Done dismisses the sheet and leaves the vault on screen.
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/v/${GIST_ID}$`));
});

test("Share falls back to Copy link without a native share sheet", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });

  await page.goto(`/v/${GIST_ID}`);
  await page.getByRole("button", { name: "Share vault" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "Share…" })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(sheet.getByText(new RegExp(`gist=${GIST_ID}`))).toBeVisible();
});
