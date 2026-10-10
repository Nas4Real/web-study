import { expect, test, type Page } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test.describe.configure({ mode: "serial" });

test("read-only session closes do not refresh Calendar or Dashboard", async ({ page }) => {
  for (const path of ["/calendar?e2eScope=session-close-read-only&date=2026-10-02&view=day", "/?e2eScope=session-close-dashboard"]) {
    await page.goto(path);
    const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
    await invoker.click();
    const dialog = page.getByRole("dialog", { name: "Physics lecture", exact: true });
    await expect(dialog.getByRole("button", { name: "Edit", exact: true })).toBeEnabled();
    const reads: string[] = [];
    const listener = (request: import("@playwright/test").Request) => {
      const url = new URL(request.url());
      if (request.method() === "GET" && url.pathname === new URL(page.url()).pathname && url.searchParams.has("_rsc")) reads.push("route-read");
    };
    page.on("request", listener);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(invoker).toBeFocused();
    // Negative network assertion needs an observation window after closing.
    await page.waitForTimeout(1000);
    page.off("request", listener);
    expect(reads).toEqual([]);
  }
});

async function openCalendarSession(page: Page, scope: string, date: string, view: "day" | "week" = "day") {
  await page.goto(`/calendar?e2eScope=${scope}&date=${date}&view=${view}`);
  const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
  await invoker.click();
  const dialog = page.getByRole("dialog", { name: "Physics lecture", exact: true });
  await expect(dialog).toBeVisible();
  return { dialog, invoker };
}

test("opens the same effective session from Day, Week, and Dashboard", { tag: "@critical" }, async ({ page }) => {
  const scope = "session-detail-surfaces";
  for (const view of ["day", "week"] as const) {
    const { dialog } = await openCalendarSession(page, scope, "2026-10-02", view);
    await expect(dialog.getByText("Physics", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Room 401", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Dr. Smith", { exact: true })).toBeVisible();
  }

  await page.goto(`/?e2eScope=${scope}`);
  await page.getByRole("button", { name: "Open Physics lecture", exact: true }).click();
  const dashboardDetail = page.getByRole("dialog", { name: "Physics lecture", exact: true });
  await expect(dashboardDetail.getByText("Room 401", { exact: true })).toBeVisible();
  await expect(dashboardDetail.getByText("Dr. Smith", { exact: true })).toBeVisible();
});

test("shows a modified occurrence without leaking its override into a sibling", async ({ page }) => {
  const scope = "session-detail-effective";
  let opened = await openCalendarSession(page, scope, "2026-10-02");
  await expect(opened.dialog.getByText("Room 401", { exact: true })).toBeVisible();
  await opened.dialog.getByRole("button", { name: "Close", exact: true }).click();

  opened = await openCalendarSession(page, scope, "2026-10-09");
  await expect(opened.dialog.getByText("Room 304", { exact: true })).toBeVisible();
  await expect(opened.dialog.getByText("Room 401", { exact: true })).toHaveCount(0);
});

test("persists an occurrence-only edit while leaving siblings unchanged", { tag: "@critical" }, async ({ page }) => {
  const scope = "session-detail-occurrence-edit";
  let opened = await openCalendarSession(page, scope, "2026-10-02");
  await opened.dialog.getByRole("button", { name: "Edit", exact: true }).click();
  const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session", exact: true });
  await expect(scopeDialog.getByRole("radio", { name: /This session only/ })).toBeChecked();
  await scopeDialog.getByRole("button", { name: "Continue" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit session", exact: true });
  await editDialog.getByLabel(/Room \/ Location/).fill("Room 499");
  await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editDialog).toBeHidden();

  opened = await openCalendarSession(page, scope, "2026-10-02");
  await expect(opened.dialog.getByText("Room 499", { exact: true })).toBeVisible();
  await opened.dialog.getByRole("button", { name: "Close", exact: true }).click();
  opened = await openCalendarSession(page, scope, "2026-10-09");
  await expect(opened.dialog.getByText("Room 304", { exact: true })).toBeVisible();
});

test("persists an entire-series edit across sibling occurrences", async ({ page }) => {
  const scope = "session-detail-series-edit";
  const opened = await openCalendarSession(page, scope, "2026-10-02");
  await opened.dialog.getByRole("button", { name: "Edit", exact: true }).click();
  const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session", exact: true });
  await scopeDialog.getByRole("radio", { name: /Entire series/ }).check();
  await scopeDialog.getByRole("button", { name: "Continue" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit session", exact: true });
  await editDialog.getByLabel("Class or Lecture Name", { exact: true }).fill("Updated physics series");
  await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editDialog).toBeHidden();

  for (const [date, location] of [["2026-10-02", "Room 401"], ["2026-10-16", "Room 304"]] as const) {
    await page.goto(`/calendar?e2eScope=${scope}&date=${date}&view=day`);
    await page.getByRole("button", { name: "Open Updated physics series", exact: true }).click();
    const detail = page.getByRole("dialog", { name: "Updated physics series", exact: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(location, { exact: true })).toBeVisible();
  }
});

test("edits and deletes a one-time session without a recurring-scope prompt", async ({ page }) => {
  const scope = "session-detail-one-time";
  await page.goto(`/calendar?e2eScope=${scope}&date=2026-10-04&view=day`);
  await page.getByRole("button", { name: "Open Physics midterm", exact: true }).click();
  let detail = page.getByRole("dialog", { name: "Physics midterm", exact: true });
  await detail.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit recurring session" })).toHaveCount(0);
  const editDialog = page.getByRole("dialog", { name: "Edit session", exact: true });
  await editDialog.getByLabel("Exam title", { exact: true }).fill("Updated physics midterm");
  await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
  // Success still reconciles the underlying page without a manual reload.
  await expect(page.getByRole("button", { name: "Open Updated physics midterm", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Physics midterm", exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Open Updated physics midterm", exact: true }).click();
  detail = page.getByRole("dialog", { name: "Updated physics midterm", exact: true });
  await detail.getByRole("button", { name: "Delete Session", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete session", exact: true });
  await expect(deleteDialog.getByRole("radio")).toHaveCount(0);
  await deleteDialog.getByRole("button", { name: "Delete session", exact: true }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Open Updated physics midterm", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Updated physics midterm", { exact: true })).toHaveCount(0);
});

test("deletes one recurring occurrence while preserving its siblings", async ({ page }) => {
  const scope = "session-detail-occurrence-delete";
  const opened = await openCalendarSession(page, scope, "2026-10-02");
  await opened.dialog.getByRole("button", { name: "Delete Session", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete recurring session", exact: true });
  await expect(deleteDialog.getByRole("radio", { name: /This session only/ })).toBeChecked();
  await deleteDialog.getByRole("button", { name: "Delete session", exact: true }).click();
  await expect(deleteDialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Physics lecture", exact: true })).toHaveCount(0);

  await page.goto(`/calendar?e2eScope=${scope}&date=2026-10-09&view=day`);
  await expect(page.getByRole("button", { name: "Open Physics lecture", exact: true })).toBeVisible();
});

test("deletes an entire recurring series and all sibling occurrences", async ({ page }) => {
  const scope = "session-detail-series-delete";
  const opened = await openCalendarSession(page, scope, "2026-10-09");
  await opened.dialog.getByRole("button", { name: "Delete Session", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete recurring session", exact: true });
  await deleteDialog.getByRole("radio", { name: /Entire series/ }).check();
  await deleteDialog.getByRole("button", { name: "Delete series", exact: true }).click();
  await expect(deleteDialog).toBeHidden();

  for (const date of ["2026-10-02", "2026-10-16"]) {
    await page.goto(`/calendar?e2eScope=${scope}&date=${date}&view=day`);
    await expect(page.getByRole("button", { name: "Open Physics lecture", exact: true })).toHaveCount(0);
  }
});

test("reports a failed detail read, retries safely, and restores invoker focus", async ({ page }) => {
  const scope = "session-detail-retry";
  await page.goto(`/calendar?e2eScope=${scope}&date=2026-10-02&view=day`);
  let failNextPost = true;
  await page.route("**/calendar?**", async route => {
    if (failNextPost && route.request().method() === "POST") {
      failNextPost = false;
      await route.abort();
    } else await route.continue();
  });
  const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
  await invoker.click();
  const alert = page.getByRole("alert").filter({ hasText: "Sessions are temporarily unavailable" });
  await expect(alert).toContainText("Sessions are temporarily unavailable. Please try again.");
  await alert.getByRole("button", { name: "Try again", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Physics lecture", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(invoker).toBeFocused();
});

for (const viewport of [
  { width: 320, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
] as const) {
  test(`matches the approved Session Details state at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/calendar");
    await page.getByRole("button", { name: "Open Capacités thermiques : modèle d'Einstein" }).click();
    await hideNextDevTools(page);
    await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBe(viewport.width);
    await expect(page).toHaveScreenshot(`session-details-${viewport.width}x${viewport.height}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}
