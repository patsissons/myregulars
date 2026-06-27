import { expect, test, type Locator } from "@playwright/test";
import { GIST_ID, setupVaultApp } from "../support";

test.beforeEach(async ({ page }) => {
  await setupVaultApp(page);
});

function fontSize(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).fontSize);
}

// Poll rather than read once: the route entry transition briefly translates
// content, so overflow settles to zero only after the animation completes.
async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth <= el.clientWidth + 1;
      }),
    )
    .toBe(true);
}

test("mobile inputs render at 16px to avoid iOS zoom (issue 8)", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}`);
  const search = page.getByRole("searchbox", { name: "Search vault" });
  await expect(search).toBeVisible();
  expect(await fontSize(search)).toBe("16px");
  await expectNoHorizontalOverflow(page);
});

test("mobile vault page reserves bottom padding for browser controls (issue 12)", async ({
  page,
}) => {
  await page.goto(`/v/${GIST_ID}`);
  const container = page.locator("div.min-h-dvh").first();
  const paddingBottom = await container.evaluate((el) =>
    parseFloat(getComputedStyle(el).paddingBottom),
  );
  expect(paddingBottom).toBeGreaterThanOrEqual(24);
});

test("mobile pages size to the dynamic viewport (issues 7, 9)", async ({ page }) => {
  // The full-screen mobile containers use min-h-dvh; assert the resolved
  // min-height tracks the viewport (not 0 / not 100vh overflow).
  for (const path of [`/v/${GIST_ID}/l/loc-cafe`, `/v/${GIST_ID}/l/loc-cafe/p/p-alice`]) {
    await page.goto(path);
    const container = page.locator("div.min-h-dvh").first();
    await expect(container).toBeVisible();
    const { minHeight, innerHeight } = await container.evaluate((el) => ({
      minHeight: parseFloat(getComputedStyle(el).minHeight),
      innerHeight: window.innerHeight,
    }));
    // dvh resolves to ~the viewport height (not 0, and not an over-tall 100vh).
    // Allow a delta for emulated browser-UI differences in either direction.
    expect(minHeight).toBeGreaterThan(innerHeight * 0.9);
    expect(Math.abs(minHeight - innerHeight)).toBeLessThanOrEqual(40);
    await expectNoHorizontalOverflow(page);
  }
});

test("the add-person FAB sits within the viewport, not below it (issue 7)", async ({ page }) => {
  await page.goto(`/v/${GIST_ID}/l/loc-cafe`);
  const fab = page.getByRole("button", { name: "Add person" });
  await expect(fab).toBeVisible();
  const box = await fab.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
});
