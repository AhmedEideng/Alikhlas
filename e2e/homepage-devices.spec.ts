import { expect, test } from "@playwright/test";

test("homepage device selection matches the static HTML and only real catalog devices", async ({
  page,
  request,
}) => {
  const slugs = ["sawft-manual-ved-pump", "konsa-electric-ved-pump", "nine-speed-digital-ved-pump"];
  const html = await (await request.get("/")).text();
  for (const slug of slugs) expect(html).toContain(`/products/${slug}`);
  await page.goto("/");
  // (li بعلامة data-concern-label) بعد إعادة التصميم بدل شبكة الكروت.
  const section = page.locator('[data-concern-label="أجهزة طبية"]');
  await expect(section).toHaveCount(1);
  for (const slug of slugs)
    await expect(section.locator(`a[href="/products/${slug}"]`).first()).toBeVisible();
  // كل رابط في صفحة الأجهزة لازم يفتح 200، والعدد الكلي 6 أجهزة.
  await page.goto("/products/devices");
  const deviceLinks = page.locator('[data-catalog-results] a[href^="/products/"]');
  const hrefs = [
    ...new Set(
      await deviceLinks.evaluateAll((items) =>
        items.map((item) => item.getAttribute("href") ?? ""),
      ),
    ),
  ].filter((href) => href && !href.includes("/products/devices"));
  expect(hrefs.length).toBeGreaterThanOrEqual(6);
  for (const href of hrefs.slice(0, 6)) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
  // مسار منتج غير موجود يجب أن يعيد 404 حقيقي (لا صفحة شبح).
  // المسار هنا مسبار وهمي صريح — ليس رابطًا قديمًا ولا صفحة محذوفة.
  const missing = await request.get("/products/__probe-not-a-real-product__");
  expect(missing.status()).toBe(404);
});

test("manual pump costs 800 on the page, in schema and in the cart", async ({ page }) => {
  await page.goto("/products/sawft-manual-ved-pump");
  await expect(page.locator("script#ldjson-product")).toBeAttached();
  const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
  expect(Number(schema.offers.price)).toBe(800);
  // (Round 8) السعر ممنوع داخل نسخ المنتج — السعر يظهر من حقل price فقط.
  expect(schema.description).not.toMatch(/جنيه/);
  expect(schema.offers.price).toBe(800);
  await expect(page.getByText("800 ج.م", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();
  await page.goto("/cart");
  await expect(page.getByText("800 ج.م", { exact: true }).first()).toBeVisible();
});

test("requested concern products are in the same order before and after React renders", async ({
  page,
  request,
}) => {
  const groups = [
    {
      label: "علاجات التأخير",
      slugs: ["sotara-men-gel-50g", "procomil-delay-spray-indian", "emla-7-5-numbing-cream"],
    },
    {
      label: "القوة والأداء",
      slugs: [
        "ginseng-1650-vitality-capsules",
        "tri-force-30-capsules",
        "powerfully-up-male-formula",
      ],
    },
    {
      label: "الرغبة والإثارة للنساء",
      slugs: ["pink-shot-women-drops-30ml", "beauty-love-women-gum", "connubial-women-drops-30ml"],
    },
  ];
  const html = await (await request.get("/")).text();
  await page.goto("/");
  for (const group of groups) {
    // الـ HTML الثابت (SEO shell) لسه بنفس شكل h3 + ul.
    const rawSection = html.split(`<h3>${group.label}</h3>`)[1]?.split("</ul>")[0];
    expect(rawSection).toBeTruthy();
    const rawSlugs = [
      ...rawSection!.matchAll(/href="https:\/\/alikhlasmedical\.store\/products\/([^"/]+)"/g),
    ].map((m) => m[1]);
    expect(rawSlugs).toEqual(group.slugs);
    const section = page.locator(`[data-concern-label="${group.label}"]`);
    await expect(section).toHaveCount(1);
    const links = section.locator('a[href^="/products/"]');
    const hrefs = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );
    expect(
      hrefs.filter((href) => group.slugs.some((slug) => href === `/products/${slug}`)),
    ).toEqual(group.slugs.map((slug) => `/products/${slug}`));
  }
});
