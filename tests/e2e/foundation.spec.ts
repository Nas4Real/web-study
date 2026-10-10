import { expect, test } from "@playwright/test";

import { hideNextDevTools } from "./visual-test-helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Today's summary" })).toBeVisible();
});

test("renders the approved Dashboard and application shell", async ({ page }) => {
  await expect(page).toHaveTitle("Web Study");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Upcoming Assignments" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Today's Classes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Task" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Mathematics" })).toBeVisible();
});

test("keeps interactive shell controls keyboard reachable", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "GetStudy" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeFocused();
});

test("matches the approved Dashboard visual baseline", async ({ page }) => {
  await hideNextDevTools(page);
  await expect(page).toHaveScreenshot("dashboard-1440x1200.png", {
    animations: "disabled",
    fullPage: true,
  });
});

for (const viewport of [
  { width: 320, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
] as const) {
  test(`keeps the Dashboard usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.reload();

    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}
