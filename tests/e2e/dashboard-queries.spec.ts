import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test("derives dashboard cards from canonical tasks and effective session data", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1200 });
  const scope = "dashboard-queries";
  await page.goto(`/tasks?e2eScope=${scope}`);
  await page.getByRole("button", { name: "New Task" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  await dialog.getByLabel("Task title").fill("Dashboard integration assignment");
  await dialog.getByLabel("Subject").selectOption({ label: "Analysis" });
  await dialog.getByLabel("Due Date").fill("2026-10-02");
  await dialog.getByRole("button", { name: "Add Task" }).click();
  await expect(dialog).toBeHidden();
  await page.goto(`/?e2eScope=${scope}`);
  await expect(page.getByRole("heading", { name: "Physics midterm", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Physics lecture", exact: true })).toBeVisible();
  await expect(page.getByText("Room 401", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("checkbox", { name: "Complete Dashboard integration assignment", exact: true })).toBeVisible();
  // Upcoming Assignments is capped at three; equal due times are ordered by ID.
  await expect(page.getByRole("heading", { name: "Complete Chapter 4 Exercises", exact: true })).toBeVisible();
  await expect(page.getByText("3 due today", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "October 2026", exact: true })).toBeVisible();
  await expect(page.getByText("0 of 3 completed", { exact: true })).toBeVisible();
  await hideNextDevTools(page);
  await page.screenshot({ path: testInfo.outputPath("derived-dashboard.png"), fullPage: true });
  expect(errors).toEqual([]);
});
