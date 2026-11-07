import { expect, test } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
  // The hosted provider is configured but not signed in; keep its instance
  // reachable so the sign-in sheet can list providers.
  await page.route("http://127.0.0.1:8090/**", (route) => {
    const url = route.request().url();
    if (url.includes("/auth-methods")) {
      return route.fulfill({
        status: 200,
        json: { oauth2: { enabled: true, providers: [{ name: "github", displayName: "GitHub" }] } },
      });
    }
    return route.fulfill({ status: 404, json: { message: "not found" } });
  });
});

test("the Storage sheet shows where the vault lives and offers the other provider", async ({
  page,
}) => {
  await page.goto(`/v/${GIST_ID}`);

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Storage…" }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Storage", { exact: true })).toBeVisible();

  const gist = sheet.getByRole("region", { name: "GitHub Gist copy" });
  await expect(gist).toHaveAttribute("data-status", "current");
  await expect(gist.getByText("testuser")).toBeVisible();
  await expect(gist.getByRole("button", { name: "Delete vault" })).toBeVisible();

  const hosted = sheet.getByRole("region", { name: "Hosted copy" });
  await expect(hosted).toHaveAttribute("data-status", "missing");
  await hosted.getByRole("button", { name: "Connect Hosted" }).click();

  // Signed out of Hosted: an inline sign-in sheet opens instead of leaving the screen.
  await expect(page.getByText("Sign in to Hosted")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with GitHub/ })).toBeVisible();
});

test("the sync chip opens the Storage sheet", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);
  await page.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("dialog").getByText("Storage", { exact: true })).toBeVisible();
});

test("deleting the last copy needs the vault name and returns to the list", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Storage…" }).click();
  await page.getByRole("button", { name: "Delete vault" }).click();

  const confirm = page.getByRole("dialog").last();
  const deleteButton = confirm.getByRole("button", { name: "Delete vault" });
  await expect(deleteButton).toBeDisabled();
  await confirm.getByLabel("Type the vault name to confirm").fill("Test Vault");
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  await expect(page).toHaveURL(/\/vaults$/);
  await expect(page.getByRole("heading", { name: "Your vaults" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Test Vault/ })).toHaveCount(0);
});
