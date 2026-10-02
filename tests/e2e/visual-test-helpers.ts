import type { Page } from "@playwright/test";

export async function hideNextDevTools(page: Page) {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await page
    .locator("script[data-nextjs-dev-overlay], nextjs-portal")
    .evaluateAll((elements) => {
      for (const element of elements) {
        (element as HTMLElement).style.setProperty("display", "none", "important");
      }
    });
}
