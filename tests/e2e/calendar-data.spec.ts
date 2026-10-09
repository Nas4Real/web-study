import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test("reads effective owned sessions and retains date/view across reload and history", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/calendar?e2eScope=calendar-readback&date=2026-10-02&view=day");
  await expect(page.getByRole("button", { name: "Day", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Vendredi, 2 Octobre 2026" })).toBeVisible();
  await expect(page.getByText("Physics lecture", { exact: true })).toBeVisible();
  await expect(page.getByText("Room 401", { exact: true })).toBeVisible();
  await expect(page.getByText("Réduction des endomorphismes", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-02.*view=week/);
  await expect(page.getByText("Physics midterm", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next period" }).click();
  await expect(page).toHaveURL(/date=2026-10-09.*view=week/);
  await expect(page.getByText("Physics midterm", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Physics lecture", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Physics midterm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByRole("gridcell")).toHaveCount(35);
  await expect(page.getByText("Physics lecture", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Physics midterm", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("grid").getByRole("button")).toHaveCount(0);
  await hideNextDevTools(page);
  await page.screenshot({ path: testInfo.outputPath("canonical-calendar-month.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("shows an actionable empty state when a day has no sessions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/calendar?e2eScope=calendar-empty-day&date=2027-02-10&view=day");

  await expect(page.getByRole("heading", { level: 2, name: "No sessions scheduled" })).toBeVisible();
  await expect(page.getByText("Your day is clear.")).toBeVisible();
  await expect(page).toHaveScreenshot("calendar-day-empty-1440x1200.png", {
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add session" }).click();
  await expect(page.getByRole("dialog", { name: "Add a session" })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole("heading", { level: 2, name: "No sessions scheduled" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

for (const [date, cells] of [["2027-02-10", 28], ["2026-11-10", 42]] as const) {
  test(`renders the complete ${cells}-cell month with no invented sessions`, async ({ page }) => {
    await page.goto(`/calendar?e2eScope=calendar-empty-${cells}&date=${date}&view=month`);
    await expect(page.getByRole("gridcell")).toHaveCount(cells);
    await expect(page.getByText("Physics lecture", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Topologie EVN", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Month", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}

test("supports canonical keyboard navigation at 320px without document overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/calendar?e2eScope=calendar-narrow&date=2026-10-02&view=day");
  await expect(page.getByText("Physics lecture", { exact: true })).toBeVisible();
  await expect(page.getByText("Room 401", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await hideNextDevTools(page);
  await page.screenshot({ path: testInfo.outputPath("canonical-calendar-day-320.png"), fullPage: true });
  await page.getByRole("button", { name: "Week", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/date=2026-10-02.*view=week.*e2eScope=calendar-narrow/);
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("normalizes duplicate date/view query input without demo fallback", async ({ page }) => {
  await page.goto("/calendar?e2eScope=calendar-duplicate&date=2026-05-01&date=2026-05-02&view=day&view=month");
  await expect(page.getByRole("heading", { level: 2, name: "28 Septembre - 4 Octobre 2026" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Physics lecture", { exact: true })).toBeVisible();
  await expect(page.getByText("Réduction des endomorphismes", { exact: true })).toHaveCount(0);
});
