import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/calendar");
});

test("switches deterministically between the approved Calendar views", async ({ page }) => {
  const weekButton = page.getByRole("button", { name: "Week" });
  const dayButton = page.getByRole("button", { name: "Day" });
  const monthButton = page.getByRole("button", { name: "Month" });

  await expect(page.getByRole("link", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
  await expect(weekButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "4 Mai - 10 Mai 2026" })).toBeVisible();
  await expect(page.getByText("Réduction des endomorphismes")).toBeVisible();

  await dayButton.click();
  await expect(dayButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Jeudi, 7 Mai 2026" })).toBeVisible();
  await expect(page.getByText("In Progress")).toBeVisible();

  await monthButton.click();
  await expect(monthButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Mai 2026" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Mai 2026" })).toBeVisible();
});

test("loads the Calendar without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.reload();
  await expect(page.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("moves the visible period using the active view", async ({ page }) => {
  await page.getByRole("button", { name: "Month" }).click();
  await page.getByRole("button", { name: "Previous period" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Avril 2026" })).toBeVisible();

  await page.getByRole("button", { name: "Next period" }).click();
  await page.getByRole("button", { name: "Next period" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Juin 2026" })).toBeVisible();
});

for (const view of ["Day", "Week", "Month"] as const) {
  test(`matches the approved ${view} visual baseline`, async ({ page }) => {
    await page.getByRole("button", { name: view }).click();
    await expect(page).toHaveScreenshot(`calendar-${view.toLowerCase()}-1440x1200.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
] as const) {
  test(`keeps Calendar navigation usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.reload();

    await expect(page.getByRole("button", { name: "Week" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}
