import { expect, test } from "@playwright/test";

import { hideNextDevTools } from "./visual-test-helpers";

for (const width of [320, 768, 1024, 1440]) {
  test(`session authoring stays accessible and saves every kind at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 900 });
    await page.goto(`/calendar?e2eScope=calendar-responsive-${width}&date=2026-10-06&view=day`);
    const invoker = page.getByRole("button", { name: "New Session", exact: true });
    await expect(invoker).toBeInViewport({ ratio: 1 });
    for (const view of ["Day", "Week", "Month"]) {
      await expect(page.getByRole("button", { name: view, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await hideNextDevTools(page);
    await page.screenshot({ path: test.info().outputPath(`calendar-header-${width}.png`) });

    for (const kind of ["University", "Exam", "Revision"]) {
      await invoker.click();
      const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
      await dialog.getByRole("button", { name: new RegExp(`^${kind}`) }).click();
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await dialog.locator("button, input:not([type=hidden]), select").evaluateAll(controls => controls.every(control => {
        const box = control.getBoundingClientRect();
        const panel = control.closest('[role="dialog"]')!.getBoundingClientRect();
        return box.width === 0 || (box.left >= panel.left && box.right <= panel.right);
      }))).toBe(true);
      const title = `${kind} responsive ${width}`;
      await dialog.getByRole("textbox").first().fill(title);
      await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
      await dialog.getByLabel("Date", { exact: true }).fill("2026-10-06");
      await dialog.getByLabel("Start time", { exact: true }).fill("14:00");
      if (kind === "Exam") await dialog.getByRole("textbox", { name: "Room / Location", exact: true }).fill("Hall A");
      else if (kind === "University") await dialog.getByLabel(/Professor/).fill("Dr. Smith");
      else await dialog.getByLabel(/Focus or chapter/).fill("Chapter 4");
      await dialog.getByRole("button", { name: "Close dialog", exact: true }).focus();
      await hideNextDevTools(page);
      if (width === 320) {
        await expect(dialog).toHaveScreenshot(`new-session-${kind.toLowerCase()}-mobile-approved-320x720.png`, { animations: "disabled" });
      }
      await page.screenshot({ path: test.info().outputPath(`session-${kind}-${width}.png`) });
      const submit = dialog.getByRole("button", { name: "Add session", exact: true });
      await submit.scrollIntoViewIfNeeded();
      await submit.focus();
      await expect(submit).toBeInViewport({ ratio: 0.99 });
      await page.screenshot({ path: test.info().outputPath(`session-footer-${kind}-${width}.png`) });
      await page.keyboard.press("Tab");
      await expect(dialog.getByRole("button", { name: "Close dialog", exact: true })).toBeFocused();
      await submit.click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(title, { exact: true })).toHaveCount(1);
      await page.reload();
      await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await invoker.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(invoker).toBeFocused();
  });
}

for (const viewport of [{ width: 320, height: 720 }, { width: 1440, height: 900 }] as const) {
  test(`matches enriched Notes & Reminders authoring at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/calendar?e2eScope=calendar-notes-visual-${viewport.width}&date=2026-10-06&view=day`);
    await page.getByRole("button", { name: "New Session", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
    await dialog.getByRole("button", { name: "Add item", exact: true }).click();
    await dialog.getByLabel("Note 1", { exact: true }).fill("Bring the lab report");
    await dialog.getByRole("button", { name: "Add item", exact: true }).click();
    await dialog.getByLabel("Note 2", { exact: true }).fill("Ask about chapter 4");
    const notes = dialog.locator("section").filter({ hasText: "Notes & Reminders" });
    await notes.scrollIntoViewIfNeeded();
    expect(await notes.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await notes.getByRole("heading", { name: "Notes & Reminders", exact: true }).click();
    await hideNextDevTools(page);
    await expect(notes).toHaveScreenshot(`new-session-notes-${viewport.width}x${viewport.height}.png`, { animations: "disabled" });
  });
}
