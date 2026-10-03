import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test("Dashboard assignments and task bodies open the same canonical detail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/?e2eScope=dashboard-detail-open");
  await page.getByRole("button", { name: "Open assignment Complete Chapter 4 Exercises", exact: true }).press("Enter");
  const assignment = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises", exact: true });
  await expect(assignment.getByRole("checkbox", { name: "Solve problems 1–15" })).not.toBeChecked();
  await assignment.getByRole("checkbox", { name: "Solve problems 1–15" }).click();
  await expect(assignment.getByRole("checkbox", { name: "Solve problems 1–15" })).toBeChecked();
  await expect(assignment.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await assignment.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open assignment Complete Chapter 4 Exercises", exact: true })).toBeFocused();
  const invoker = page.getByRole("button", { name: "Open task Read Chapter 4: Forces", exact: true });
  await invoker.press("Space");
  const task = page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true });
  await expect(task.getByText("Read pages 45–60 and summarize key formulas.", { exact: true })).toBeVisible();
  await hideNextDevTools(page);
  await page.screenshot({ path: "test-results/dashboard-task-details.png", fullPage: true });
  await task.getByRole("button", { name: "Close", exact: true }).click();
  await expect(invoker).toBeFocused();
  await page.goto("/tasks?e2eScope=dashboard-detail-open");
  await page.getByRole("button", { name: "Open Complete Chapter 4 Exercises", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Solve problems 1–15" })).toBeChecked();
});

test("Dashboard checkbox never opens detail and deletion synchronizes both surfaces", async ({ page }) => {
  await page.goto("/?e2eScope=dashboard-detail-mutate");
  await page.getByRole("checkbox", { name: "Complete Read Chapter 4: Forces", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Reopen Read Chapter 4: Forces", exact: true })).toBeChecked();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open assignment Read Chapter 4: Forces", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open task Read Chapter 4: Forces", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true });
  await dialog.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Complete Read Chapter 4: Forces", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Open assignment Read Chapter 4: Forces", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete Task", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete task?", exact: true }).getByRole("button", { name: "Delete Task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open task Read Chapter 4: Forces", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open assignment Read Chapter 4: Forces", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open task Read Chapter 4: Forces", exact: true })).toHaveCount(0);
  await page.goto("/tasks?e2eScope=dashboard-detail-mutate");
  await expect(page.getByRole("button", { name: "Open Read Chapter 4: Forces", exact: true })).toHaveCount(0);
});

test("failed Dashboard checkbox saves leave the task unchanged", async ({ page }) => {
  await page.goto("/?e2eScope=dashboard-detail-failure");
  await page.route("**/?e2eScope=dashboard-detail-failure", async route => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  await page.getByRole("checkbox", { name: "Complete Read Chapter 4: Forces", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Complete Read Chapter 4: Forces", exact: true })).not.toBeChecked();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const surface of ["dashboard", "tasks"] as const) {
  test(`a delayed deletion on ${surface} does not dismiss another selected task`, async ({ page }) => {
    const scope = `detail-delayed-${surface}`;
    await page.goto(`${surface === "dashboard" ? "/" : "/tasks"}?e2eScope=${scope}`);
    const prefix = surface === "dashboard" ? "Open assignment " : "Open ";
    // Preload this detail: Next serializes server actions behind the held deletion.
    await page.getByRole("button", { name: `${prefix}Read Chapter 4: Forces`, exact: true }).click();
    await page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
    let releaseDelete!: () => void;
    let markRequested!: () => void;
    const held = new Promise<void>(resolve => { releaseDelete = resolve; });
    const requested = new Promise<void>(resolve => { markRequested = resolve; });
    await page.route(`**/*e2eScope=${scope}`, async route => {
      if (route.request().method() === "POST" && route.request().postData()?.includes('"type":"delete"')) {
        markRequested();
        await held;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: `${prefix}Complete Chapter 4 Exercises`, exact: true }).click();
    const original = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises", exact: true });
    await original.getByRole("button", { name: "Delete Task", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Delete task?", exact: true });
    await confirmation.getByRole("button", { name: "Delete Task", exact: true }).click();
    await requested;
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await original.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: `${prefix}Read Chapter 4: Forces`, exact: true }).click();
    const selected = page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true });
    await expect(selected).toBeVisible();
    releaseDelete();
    await expect(page.getByRole("button", { name: `${prefix}Complete Chapter 4 Exercises`, exact: true })).toHaveCount(0);
    await expect(selected).toBeVisible();
  });
}
