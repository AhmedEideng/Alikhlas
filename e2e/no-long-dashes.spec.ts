import { expect, test } from "@playwright/test";

/**
 * 🚫 لا شرطة طويلة (—) ولا متوسطة (–) في أي نص يظهر للمستخدم.
 *
 * السبب: الشرطة الطويلة تقطع جملة العربية بصريًا وتجعل النص يبدو مُولَّدًا
 * لا مكتوبًا. البديل المعتمد: فاصلة عربية «،» أو نقطتان «:» أو «|» في
 * العناوين، مع الحفاظ على الفاصلة داخل أسماء المنتجات.
 *
 * الفحص يتم على النص المرئي فعليًا (innerText) لا على الـ HTML، حتى لا
 * تتعارض مع أي شرطة داخل تعليق أو كلاس أو regex.
 */
const PAGES = [
  "/",
  "/products/men",
  "/products/women",
  "/products/devices",
  "/products/prices",
  "/education",
  "/cart",
  "/about",
];

const BANNED = /[—–]/;

for (const path of PAGES) {
  test(`لا شرطة طويلة في نص ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => document.body.innerText);
    const offenders = text
      .split("\n")
      .filter((line) => BANNED.test(line))
      .slice(0, 5);
    expect(offenders, `شرطة طويلة في ${path}`).toEqual([]);
  });
}

test("لا شرطة طويلة في عناوين الصفحات ووسوم المشاركة", async ({ request }) => {
  for (const path of ["/", "/products/men", "/education", "/products/prices"]) {
    const html = await (await request.get(path)).text();
    const titles = [...html.matchAll(/<(?:title|meta[^>]*content=")([^<"]{0,200})/g)].map(
      (m) => m[1],
    );
    for (const t of titles) expect(BANNED.test(t), `وسم فيه شرطة طويلة: ${t}`).toBe(false);
  }
});
