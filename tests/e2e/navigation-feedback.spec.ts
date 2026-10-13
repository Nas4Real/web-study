import { expect, test, type Page } from "@playwright/test";

async function holdNavigation(page: Page, pathname: string) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${pathname}?*`, async (route) => {
    if (route.request().headers().rsc !== "1") return route.continue();
    await held;
    await route.continue().catch(() => {}); // An interrupted request may be cancelled.
  });
  return release;
}

test("sidebar acknowledges a stalled destination and permits interruption", async ({ page }, testInfo) => {
  await page.goto("/tasks?e2eScope=navigation-feedback");
  const release = await holdNavigation(page, "/calendar");
  try {
    const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    await nav.getByRole("link", { name: "Calendar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("pending-desktop.png") });
    await expect(nav.getByRole("link", { name: "Documents" })).toBeEnabled();
    await nav.getByRole("link", { name: "Documents" }).click();
    await expect(page).toHaveURL(/\/documents/);
    release();
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  } finally { release(); }
});

test("mobile search acknowledges keyboard navigation without moving focus", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tasks?e2eScope=navigation-search-feedback");
  const release = await holdNavigation(page, "/calendar");
  try {
    const search = page.getByRole("combobox", { name: "Search Web Study navigation" });
    await search.fill("sessions");
    await search.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toBeVisible();
    await expect(search).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("pending-mobile.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    release();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toHaveCount(0);
  } finally { release(); }
});

test("a newer search destination wins over a stalled search", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tasks?e2eScope=navigation-search-interruption");
  const release = await holdNavigation(page, "/calendar");
  try {
    const search = page.getByRole("combobox", { name: "Search Web Study navigation" });
    await search.fill("Calendar");
    await search.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toBeVisible();
    await search.fill("Documents");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/documents/);
    release();
    await expect(page.getByRole("status").filter({ hasText: "Loading Calendar" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  } finally { release(); }
});
