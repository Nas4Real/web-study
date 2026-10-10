import { expect, test } from "@playwright/test";

import { hideNextDevTools } from "./visual-test-helpers";

test.describe("workspace surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
  });

  test("navigates to Tasks and opens the approved task dialogs", async ({ page }) => {
    await page.goto("/tasks");

    await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "Pending" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page.getByRole("dialog", { name: "Create new task" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Create new task" })).toBeHidden();

    await page.getByRole("button", { name: "Open Complete Chapter 4 Exercises" }).click();
    const taskDialog = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises" });
    await expect(taskDialog).toBeVisible();
    await expect(taskDialog.getByRole("button", { name: "Complete", exact: true })).toBeVisible();
  });

  test("renders Documents with the approved sections", async ({ page }) => {
    await page.goto("/documents");

    await expect(page.getByRole("link", { name: "GetStudy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Subjects" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Recent" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "All Files" })).toBeVisible();
  });

  test("searches, sorts, and navigates the approved Documents hierarchy", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/documents");

    const search = page.getByRole("searchbox", { name: "Search documents" });
    await search.fill("Q4");
    await expect(page.getByRole("cell", { name: "Q4 Results" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Sequence Data" })).toBeHidden();
    await search.clear();

    await page.getByRole("button", { name: "Sort By: Latest" }).click();
    await page.getByRole("button", { name: "Name", exact: true }).click();
    await expect(page.locator("tbody tr").first()).toContainText("Analysis Data April");

    await page.getByRole("button", { name: /Analysis 8 Chapters/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Analysis" })).toBeVisible();
    await page.getByRole("button", { name: /Chapter 1: Series/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Chapter 1: Series" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Uploads are unavailable until storage is connected" })).toBeDisabled();
    await page.getByRole("button", { name: /TD 1 File/ }).click();
    await expect(page.getByText("Sequence Data", { exact: true })).toBeVisible();
    await expect(page.getByText("Analysis Data April", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Back to Analysis" }).click();
    await page.getByRole("button", { name: "Back to Documents" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Recent" })).toBeVisible();
  });

  test("renders locked Settings values and profile menu", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("348 MB / 2 GB")).toBeVisible();
    await expect(page.getByRole("link", { name: "Update Password" })).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByRole("button", { name: "Notification preferences are not available yet" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Account deletion is not available yet" })).toBeDisabled();

    await page.getByRole("button", { name: "Open profile menu" }).click();
    const profileMenu = page.getByRole("menu", { name: "Profile menu" });
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu.getByText("nas@example.com")).toBeVisible();
  });

  test("updates the authenticated profile from Settings", async ({ page }) => {
    await page.goto("/settings?e2eScope=settings-profile-update");
    const fullName = page.getByLabel("Full Name");
    await fullName.fill("Nas Study");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible();
    await expect(fullName).toHaveValue("Nas Study");
  });

  test("opens approved New Session and Session Details dialogs", async ({ page }) => {
    await page.goto("/calendar");

    await page.getByRole("button", { name: "New Session" }).click();
    await expect(page.getByRole("dialog", { name: "Add a session" })).toBeVisible();
    await expect(page.getByRole("button", { name: "University Class or lecture" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open Capacités thermiques : modèle d'Einstein" }).click();
    await expect(page.getByRole("dialog", { name: "Quantum Mechanics Lecture" })).toBeVisible();
    await expect(page.getByText("Room 304, Sci-Tech")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Notes & Reminders" })).toBeVisible();
  });

  for (const surface of [
    { name: "tasks", path: "/tasks" },
    { name: "documents", path: "/documents" },
    { name: "settings", path: "/settings" },
  ] as const) {
    test(`matches the approved ${surface.name} visual baseline`, async ({ page }) => {
      await page.goto(surface.path);
      await page.waitForLoadState("networkidle");
      await hideNextDevTools(page);
        await expect(page).toHaveScreenshot(`${surface.name}-1440x1200.png`, {
          animations: "disabled",
          fullPage: true,
          maxDiffPixels: surface.name === "documents" ? 2 : 0,
        });
    });
  }

  test("matches the approved profile menu visual baseline", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await expect(page).toHaveScreenshot("profile-menu-1440x1200.png", {
      animations: "disabled",
      fullPage: true,
    });
  });

  test("matches the approved task dialog visual baselines", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("button", { name: "New Task" })).toBeVisible();
    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page.getByRole("dialog", { name: "Create new task" })).toBeVisible();
    await hideNextDevTools(page);
    await expect(page).toHaveScreenshot("new-task-authoring-1440x1200.png", {
      animations: "disabled",
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open Complete Chapter 4 Exercises" }).click();
    await expect(page.getByRole("dialog", { name: "Complete Chapter 4 Exercises" })).toBeVisible();
    await hideNextDevTools(page);
    // Preserve the original approved fixture image; canonical text/dates now replace its hardcoded content.
    await expect(page.getByRole("dialog").getByText("Due Yesterday, 11:59 PM", { exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot("task-details-canonical-1440x1200.png", {
      animations: "disabled",
      fullPage: true,
    });
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Delete task?", exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot("task-delete-confirmation-1440x1200.png", {
      animations: "disabled", fullPage: true,
    });
  });

  for (const sessionType of [
    { button: "University Class or lecture", name: "university" },
    { button: "Exam Test or mock", name: "exam" },
    { button: "Revision Solo study", name: "revision" },
  ] as const) {
    test(`matches the approved new ${sessionType.name} session visual baseline`, async ({ page }) => {
      await page.goto("/calendar");
      await page.getByRole("button", { name: "New Session" }).click();
      await page.getByRole("button", { name: sessionType.button }).click();
      await hideNextDevTools(page);
      // Keep v96 images unchanged; the approved v2 recurrence section adds one-time default controls.
      await expect(page).toHaveScreenshot(`new-session-${sessionType.name}-recurrence-v2-1440x1200.png`, {
        animations: "disabled",
        fullPage: true,
      });
    });
  }

  test("matches the approved session details visual baseline", async ({ page }) => {
    await page.goto("/calendar");
    await page.getByRole("button", { name: "Open Capacités thermiques : modèle d'Einstein" }).click();
    await expect(page).toHaveScreenshot("session-details-1440x1200.png", {
      animations: "disabled",
      fullPage: true,
    });
  });

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
  ] as const) {
    for (const surface of ["tasks", "documents", "settings"] as const) {
      test(`keeps ${surface} usable at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(`/${surface}`);

        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);
      });
    }
  }
});
