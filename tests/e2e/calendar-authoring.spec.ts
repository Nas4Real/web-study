import { expect, test } from "@playwright/test";

import { hideNextDevTools } from "./visual-test-helpers";

for (const kind of ["Exam", "University", "Revision"] as const) {
  test(`saves ${kind} through the approved form and reads it after reload`, async ({ page }) => {
    const scope = `calendar-authoring-${kind.toLowerCase()}`;
    const title = `${kind} saved session`;
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto(`/calendar?e2eScope=${scope}&date=2026-10-06&view=day`);
    await page.getByRole("button", { name: "New Session", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
    await dialog.getByRole("button", { name: new RegExp(`^${kind}`) }).click();
    await dialog.getByRole("textbox").first().fill(title);
    await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
    await dialog.getByLabel("Date", { exact: true }).fill("2026-10-06");
    await dialog.getByLabel("Start time", { exact: true }).fill("14:00");
    if (kind === "Exam") {
      await expect(dialog.getByLabel("Duration", { exact: true })).toHaveCount(0);
      await dialog.getByLabel("Room / Location", { exact: true }).fill("Hall A");
    } else {
      await dialog.getByLabel("Duration", { exact: true }).selectOption("60");
      if (kind === "University") await dialog.getByLabel(/Professor/).fill("Dr. Smith");
      else await dialog.getByLabel(/Focus or chapter/).fill("Chapter 4");
    }
    await dialog.getByRole("button", { name: "Add session", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    if (kind === "Exam") await expect(page.getByText("Hall A", { exact: true })).toBeVisible();
    else await expect(page.getByText("60m", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await page.goto(`/calendar?e2eScope=${scope}-other&date=2026-10-06&view=day`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });
}

test("retains entered values after a rejected save and permits a corrected retry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/calendar?e2eScope=calendar-authoring-retry&date=2026-10-06&view=day");
  await page.getByRole("button", { name: "New Session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
  await dialog.getByRole("textbox").first().fill("   ");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-06");
  await dialog.getByLabel("Start time", { exact: true }).fill("14:00");
  await dialog.getByLabel("Duration", { exact: true }).selectOption("60");
  await dialog.getByLabel(/Professor/).fill("Dr. Smith");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Check the session details and try again.");
  await expect(dialog.getByRole("textbox").first()).toHaveValue("   ");
  await expect(dialog.getByLabel("Date", { exact: true })).toHaveValue("2026-10-06");
  await expect(dialog.getByLabel("Start time", { exact: true })).toHaveValue("14:00");
  await expect(dialog.getByLabel("Duration", { exact: true })).toHaveValue("60");
  await expect(dialog.getByLabel(/Professor/)).toHaveValue("Dr. Smith");
  await hideNextDevTools(page);
  await page.screenshot({ path: test.info().outputPath("session-retry.png") });
  await dialog.getByRole("textbox").first().fill("Corrected session");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Corrected session", { exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("Corrected session", { exact: true })).toHaveCount(1);
});

test("locks pending controls and prevents dismissing an in-flight save", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/calendar?**", async route => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });
  await page.goto("/calendar?e2eScope=calendar-authoring-pending&date=2026-10-06&view=day");
  await page.getByRole("button", { name: "New Session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
  await dialog.getByRole("textbox").first().fill("Pending session");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-06");
  await dialog.getByLabel("Start time", { exact: true }).fill("14:00");
  await dialog.getByLabel("Repeat", { exact: true }).selectOption("weekly");
  await dialog.getByLabel("Ends", { exact: true }).selectOption("count");
  await dialog.getByLabel("Occurrences", { exact: true }).fill("2");
  try {
    await dialog.getByRole("button", { name: "Add session", exact: true }).click();
    await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "true");
    await expect(dialog.getByRole("button", { name: "Saving...", exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Subject", { exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Repeat", { exact: true })).toBeDisabled();
    await expect(dialog.getByLabel("Occurrences", { exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Tuesday", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /^Exam/ })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Close dialog", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
    await hideNextDevTools(page);
    await page.screenshot({ path: test.info().outputPath("session-saving.png") });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
  } finally { release(); }
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Pending session", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByText("Pending session", { exact: true })).toHaveCount(2);
});

test("uses approved duration choices and submits only the active kind's fields", async ({ page }) => {
  await page.goto("/calendar?e2eScope=calendar-authoring-switch&date=2026-10-06&view=day");
  await page.getByRole("button", { name: "New Session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
  await expect(dialog.getByLabel("Duration", { exact: true })).toHaveValue("45");
  expect(await dialog.getByLabel("Duration", { exact: true }).locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["45", "60", "90", "120"]);
  await dialog.getByLabel(/Professor/).fill("Not a revision professor");
  await dialog.getByRole("button", { name: /^Exam/ }).click();
  await dialog.getByLabel("Room / Location", { exact: true }).fill("Not a revision room");
  await dialog.getByRole("button", { name: /^Revision/ }).click();
  await expect(dialog.getByLabel("Duration", { exact: true })).toHaveValue("90");
  await expect(dialog.getByLabel("Duration", { exact: true }).locator("option")).toHaveCount(5);
  expect(await dialog.getByLabel("Duration", { exact: true }).locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["30", "60", "90", "120", "180"]);
  await dialog.getByLabel("Duration", { exact: true }).selectOption("180");
  await expect(dialog.getByLabel(/Professor/)).toHaveCount(0);
  await expect(dialog.getByLabel("Room / Location", { exact: true })).toHaveCount(0);
  await dialog.getByRole("textbox").first().fill("Switched revision");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Physics" });
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-06");
  await dialog.getByLabel("Start time", { exact: true }).fill("14:00");
  await dialog.getByLabel(/Focus or chapter/).fill("Chapter 4");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Switched revision", { exact: true })).toHaveCount(1);
  await expect(page.getByText("180m", { exact: true })).toBeVisible();
});

test("native validation blocks empty submission and Escape restores the invoker", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  await page.goto("/calendar?e2eScope=calendar-authoring-required&date=2026-10-06&view=day");
  const invoker = page.getByRole("button", { name: "New Session", exact: true });
  await invoker.click();
  const dialog = page.getByRole("dialog", { name: "Add a session", exact: true });
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog.getByRole("textbox").first()).toBeFocused();
  expect(posts).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
});
