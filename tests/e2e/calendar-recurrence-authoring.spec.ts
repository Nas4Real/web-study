import { expect, test, type Page } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

async function openForm(page: Page, scope: string, date = "2026-10-05") {
  await page.goto(`/calendar?e2eScope=${scope}&date=${date}&view=day`);
  await page.getByRole("button", { name: "New Session", exact: true }).click();
  return page.getByRole("dialog", { name: "Add a session", exact: true });
}

for (const kind of ["Exam", "University", "Revision"] as const) {
  test(`creates recurring ${kind} and reads bounded occurrences after reload`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    const scope = `recurrence-create-${kind}`;
    const date = kind === "Revision" ? "2026-01-31" : "2026-10-05";
    const title = `Recurring ${kind}`;
    const dialog = await openForm(page, scope, date);
    await dialog.getByRole("button", { name: new RegExp(`^${kind}`) }).click();
    await expect(dialog.getByLabel("Repeat", { exact: true })).toHaveValue("none");
    await dialog.getByRole("textbox").first().fill(title);
    await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
    await dialog.getByLabel("Date", { exact: true }).fill(date);
    await dialog.getByLabel("Start time", { exact: true }).fill("09:00");
    await dialog.getByLabel("Repeat", { exact: true }).selectOption(kind === "Revision" ? "monthly" : kind === "Exam" ? "daily" : "weekly");
    if (kind !== "Revision") await dialog.getByLabel("Repeat every", { exact: true }).fill("2");
    if (kind === "University") {
      await expect(dialog.getByRole("button", { name: "Monday", exact: true })).toHaveAttribute("aria-pressed", "true");
      await dialog.getByRole("button", { name: "Wednesday", exact: true }).click();
    }
    if (kind === "Revision") await expect(dialog.getByText(/Months without that date are skipped/)).toBeVisible();
    await dialog.getByLabel("Ends", { exact: true }).selectOption("count");
    await dialog.getByLabel("Occurrences", { exact: true }).fill(kind === "University" ? "4" : "3");
    await expect(dialog.getByText("Times follow your profile timezone: Africa/Tunis.", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Add session", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(kind === "Revision" ? 1 : kind === "Exam" ? 3 : 2);
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(kind === "University" ? 4 : kind === "Exam" ? 3 : 1);
    const last = kind === "Revision" ? "2026-05-31" : kind === "Exam" ? "2026-10-09" : "2026-10-21";
    await page.goto(`/calendar?e2eScope=${scope}&date=${last}&view=day`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    const absent = kind === "Revision" ? "2026-02-28" : "2026-11-02";
    await page.goto(`/calendar?e2eScope=${scope}&date=${absent}&view=day`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await page.goto(`/calendar?e2eScope=${scope}-other&date=${date}&view=month`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });
}

test("retains recurrence after a rejected save, retries, and includes the end date", async ({ page }) => {
  const scope = "recurrence-retry-until";
  const dialog = await openForm(page, scope);
  await dialog.getByRole("textbox").first().fill("   ");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-05");
  await dialog.getByLabel("Start time", { exact: true }).fill("09:00");
  await dialog.getByLabel("Repeat", { exact: true }).selectOption("daily");
  await dialog.getByLabel("Ends", { exact: true }).selectOption("date");
  await dialog.getByLabel("End date", { exact: true }).fill("2026-10-07");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Check the session details and try again.");
  await expect(dialog.getByLabel("Repeat", { exact: true })).toHaveValue("daily");
  await expect(dialog.getByLabel("Ends", { exact: true })).toHaveValue("date");
  await expect(dialog.getByLabel("End date", { exact: true })).toHaveValue("2026-10-07");
  await dialog.getByRole("textbox").first().fill("Until inclusive");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByText("Until inclusive", { exact: true })).toHaveCount(3);
  await page.reload();
  await expect(page.getByText("Until inclusive", { exact: true })).toHaveCount(3);
});

for (const width of [320, 768, 1024, 1440]) {
  test(`recurrence controls follow the approved layout and keyboard behavior at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 900 });
    const dialog = await openForm(page, `recurrence-responsive-${width}`);
    await dialog.getByLabel("Date", { exact: true }).fill("2026-05-07");
    await dialog.getByLabel("Repeat", { exact: true }).selectOption("weekly");
    await dialog.getByLabel("Ends", { exact: true }).selectOption("count");
    await dialog.getByLabel("Occurrences", { exact: true }).fill("12");
    await expect(dialog.getByRole("button", { name: "Thursday", exact: true })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Thursday", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Thursday", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await dialog.locator("button, input:not([type=hidden]), select").evaluateAll(controls => controls.every(control => {
      const box = control.getBoundingClientRect();
      const panel = control.closest('[role="dialog"]')!.getBoundingClientRect();
      return box.width === 0 || (box.left >= panel.left && box.right <= panel.right);
    }))).toBe(true);
    await hideNextDevTools(page);
    await expect(dialog.locator("#session-recurrence")).toHaveScreenshot(`recurrence-controls-approved-v2-${width}.png`, { animations: "disabled" });
    const submit = dialog.getByRole("button", { name: "Add session", exact: true });
    await submit.focus();
    await expect(submit).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: test.info().outputPath(`recurrence-footer-${width}.png`) });
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close dialog", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "New Session", exact: true })).toBeFocused();
  });
}

test("blocks invalid recurrence natively and switching to one-time drops inactive settings", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  const dialog = await openForm(page, "recurrence-one-time-switch");
  await dialog.getByRole("textbox").first().fill("One time after switching");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-05");
  await dialog.getByLabel("Start time", { exact: true }).fill("09:00");
  await dialog.getByLabel("Repeat", { exact: true }).selectOption("daily");
  await dialog.getByLabel("Repeat every", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog.getByLabel("Repeat every", { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await dialog.getByLabel("Repeat every", { exact: true }).fill("1");
  await dialog.getByLabel("Ends", { exact: true }).selectOption("count");
  await dialog.getByLabel("Occurrences", { exact: true }).fill("501");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog.getByLabel("Occurrences", { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await dialog.getByLabel("Repeat", { exact: true }).selectOption("none");
  await expect(dialog.getByLabel("Occurrences", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(posts).toBe(1);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByText("One time after switching", { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("One time after switching", { exact: true })).toHaveCount(1);
});
