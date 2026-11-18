import { expect, test } from "@playwright/test";

import { reviewBoardPage } from "../src/data/review-board-content";

test("editorial transparency is crawlable and remains in the footer", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('href="/medical-review-board"');
  await page.goto("/");
  await expect(page.locator('footer a[href="/medical-review-board"]')).toBeVisible();
  await page.locator('footer a[href="/medical-review-board"]').click();
  await expect(
    page.getByRole("heading", { name: reviewBoardPage.title, exact: true }),
  ).toBeVisible();
});
