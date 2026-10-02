import { expect, test } from "@playwright/test";

test("creates, completes, reopens, and moves a task to Someday", async ({ page }) => {
  await page.goto("/tasks?e2eScope=task-actions");

  await page.getByRole("button", { name: "New Task" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  await dialog.getByLabel("Task title").fill("Prepare topology summary");
  await dialog.getByLabel("Subject").selectOption({ label: "Analysis" });
  await dialog.getByLabel("Due Date").fill("2026-10-02");
  await dialog.getByLabel(/Notes/).fill("Summarize the compactness section.");
  await dialog.getByRole("button", { name: "Add Task" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeVisible();

  await page.getByRole("button", { name: "Complete Prepare topology summary" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeHidden();
  await page.getByRole("button", { name: "Completed" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeVisible();

  await page.getByRole("button", { name: "Reopen Prepare topology summary" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeHidden();
  await page.getByRole("button", { name: "Pending" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeVisible();

  await page.getByRole("button", { name: "More actions for Prepare topology summary" }).click();
  await page.getByRole("button", { name: "Move to Someday" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeHidden();
  await page.getByRole("button", { name: "Someday" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Open Prepare topology summary" })).toBeVisible();
});
