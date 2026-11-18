import { expect, test } from "@playwright/test";

import { productPageCopy } from "../src/data/product-page-copy";
import catalog from "../api/lib/products-db.json" with { type: "json" };

const path = "/products/kreva-advanced-men-gel-50g";
const historicalMeta =
  // (Round 9) النص تحدّث مع إزالة «الألماني المتطور/بعناية/التحكم الكامل» من
  // وصف المنتج؛ الحارس باقٍ على نفس الغرض: الميتا ثابتة ومطابقة بعد الريفريش.
  "جل كريفا للرجال (Kreva Gel 50GM) هو تركيبة جل كريمي متخصصة ثنائية المفعول (ساخن وبارد) لدعم الأداء والتحكم في وقت العلاقة. يجمع زيت Cayenne Oil الذي ينشط…";

for (const width of [390, 1280]) {
  test(`Kreva August restoration stays consistent after refresh at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const reviewsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/reviews?product=m-60")) reviewsRequests.push(request.url());
    });
    await page.route("**/api/reviews?product=m-60", (route) =>
      route.fulfill({ json: { reviews: [] } }),
    );
    await page.route("**/api/submit-review", async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({ productId: "m-60", rating: 4 });
      await route.fulfill({ json: { success: true } });
    });
    await page.goto(path);
    for (let pass = 0; pass < 2; pass++) {
      if (pass) await page.reload();
      await expect(page.locator("script#ldjson-product")).toBeAttached();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        // داخل الاسم؛ باقي الحارس (السعر/الميتا/الكانونيكال/المراجعات) كما هو.
        "جل كريفا الألماني الفاخر — 50 جم (Kreva Gel)",
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        historicalMeta,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://alikhlasmedical.store/products/kreva-advanced-men-gel-50g",
      );
      const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
      expect(Number(schema.offers.price)).toBe(280);
      expect(schema.offers.availability).toBe("https://schema.org/InStock");
      expect(schema.aggregateRating).toBeUndefined();
      expect(schema.review).toBeUndefined();
      expect(schema.description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول");
      // نص الاستخدام يُشتق من الكتالوج بدل نسخه هنا (كان منسوخًا فتجاوزه المحتوى)
      const kreva = catalog.find((item) => item.id === "m-60");
      if (!kreva) throw new Error("Kreva is missing from the catalog");
      const usageSnippet = kreva.usage.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      await expect(page.getByText(new RegExp(usageSnippet)).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: productPageCopy.reviewTitle })).toBeVisible();
      await expect(page.getByRole("heading", { name: "تجارب عملاء حقيقية" })).toHaveCount(1);
      await expect(page.getByText(/متوسط \d+ مراجعة موثقة/)).toHaveCount(0);
      await expect.poll(() => reviewsRequests.length).toBeGreaterThanOrEqual(pass + 1);
      await page.getByRole("radio", { name: "4 من 5 نجوم" }).click();
      await page
        .getByPlaceholder("اكتب تجربتك الصادقة مع المنتج (10 أحرف على الأقل)…")
        .fill("اختبار تقني للنموذج بدون نشر مراجعة.");
      await page.getByRole("button", { name: "إرسال المراجعة", exact: true }).click();
      await expect(page.getByText(/تم استلام مراجعتك وهي الآن قيد المراجعة/)).toBeVisible();
    }
  });
}
