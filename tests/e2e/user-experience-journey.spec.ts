import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

function collectRuntimeProblems(page: import("@playwright/test").Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test("a returning student can move through a focused desktop study journey", async ({ page }, testInfo) => {
  const problems = collectRuntimeProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?e2eScope=second-ux-desktop");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.keyboard.press("Control+K");
  const navigationSearch = page.getByRole("combobox", { name: "Search Web Study navigation" });
  await expect(navigationSearch).toBeFocused();
  await navigationSearch.fill("tasks");
  await navigationSearch.press("Enter");
  await expect(page).toHaveURL(/\/tasks/);
  await page.goto("/tasks?e2eScope=second-ux-desktop");

  await page.getByRole("button", { name: "New Task" }).click();
  const taskDialog = page.getByRole("dialog", { name: "Create new task" });
  await taskDialog.getByLabel("Task title").fill("Review thermodynamics notes");
  await taskDialog.getByLabel("Subject").selectOption({ label: "Physics" });
  await taskDialog.getByLabel(/Description/).fill("Prepare a one-page summary before class.");
  await taskDialog.getByRole("button", { name: "Add Task" }).click();
  await expect(taskDialog).toBeHidden();
  const createdTask = page.getByRole("button", { name: "Open Review thermodynamics notes" });
  await expect(createdTask).toBeVisible();
  await createdTask.click();
  const detailDialog = page.getByRole("dialog", { name: "Review thermodynamics notes" });
  await expect(detailDialog.getByText("Prepare a one-page summary before class.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detailDialog).toBeHidden();
  await expect(createdTask).toBeFocused();

  await page.keyboard.press("Control+K");
  await navigationSearch.fill("calendar");
  await navigationSearch.press("Enter");
  await expect(page).toHaveURL(/\/calendar/);
  const newSession = page.getByRole("button", { name: "New Session", exact: true });
  await newSession.click();
  const sessionDialog = page.getByRole("dialog", { name: "Add a session" });
  await expect(sessionDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sessionDialog).toBeHidden();
  await expect(newSession).toBeFocused();

  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Uploads are unavailable until storage is connected" })).toBeDisabled();
  await page.getByRole("button", { name: /Analysis/ }).first().click();
  await expect(page.getByPlaceholder("New chapter name")).toBeVisible();
  await page.getByRole("button", { name: "Back to Documents" }).click();

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Subject Name")).toBeVisible();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByRole("menu", { name: "Profile menu" }).getByText("nas@example.com")).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("desktop-journey.png") });
  expect(problems).toEqual([]);
});

test("a student can navigate and open core actions on a narrow phone", async ({ page }, testInfo) => {
  const problems = collectRuntimeProblems(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?e2eScope=second-ux-mobile");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile primary navigation" });
  await mobileNavigation.getByRole("link", { name: "Tasks" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await page.goto("/tasks?e2eScope=second-ux-mobile");
  const newTask = page.getByRole("button", { name: "New Task" });
  await newTask.click();
  const taskDialog = page.getByRole("dialog", { name: "Create new task" });
  await expect(taskDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(taskDialog).toBeHidden();
  await expect(newTask).toBeFocused();

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile primary navigation" }).getByRole("link", { name: "Documents" }).click();
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Uploads are unavailable until storage is connected" })).toBeDisabled();

  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("mobile-journey.png") });
  expect(problems).toEqual([]);
});
