import { expect, test } from "@playwright/test";

test("signed-in desktop navigation, identity, subjects, and documents are usable", async ({ page }) => {
  await page.goto("/settings?e2eScope=signed-in-usability");

  await expect(page.getByText("nas@example.com").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Subjects" })).toBeVisible();
  await page.getByLabel("Subject Name").fill("Chemistry");
  await page.getByRole("button", { name: "Add Subject" }).click();
  await expect(page.getByText("Subject created.")).toBeVisible();

  const navigationSearch = page.getByRole("combobox", { name: "Search Web Study navigation" });
  await navigationSearch.fill("files");
  await navigationSearch.press("Enter");
  await expect(page).toHaveURL(/\/documents/);
  await expect(page.getByRole("button", { name: "Uploads are unavailable until storage is connected" })).toBeDisabled();

  await page.getByRole("button", { name: /Analysis/ }).first().click();
  await expect(page.getByPlaceholder("New chapter name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Chapter" })).toBeVisible();
});

test("signed-in mobile navigation exposes every available workspace", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tasks?e2eScope=signed-in-mobile");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile primary navigation" });
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Planning" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Tasks" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Documents" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Settings" })).toBeVisible();

  await navigation.getByRole("link", { name: "Documents" }).click();
  await expect(page).toHaveURL(/\/documents/);
});
