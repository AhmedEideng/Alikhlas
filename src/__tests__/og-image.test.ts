import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

/**
 * (2026-11-23) معاينة واتساب للنطاق كانت بتظهر بشعار صغير واسم غير مقروء،
 * لأن البطاقة القديمة كانت تحط الشعار داخل لوحة بيضاء بمساحات ميتة كبيرة.
 * البطاقة الجديدة 1200×630 بنص حقيقي وخط Cairo عريض، وحجمها معقول لسرعة
 * الجلب (واتساب/فيسبوك بيجيبوا الصورة عند كل مشاركة).
 *
 * الاختبار بيثبّت: المقاس القياسي، المسار المستخدم في كل الصفحات، وحد أقصى
 * للحجم، وإن المولّد موجود (فالتعديل مستقبلًا يبقى قابلًا لإعادة التوليد).
 */

const ROOT = resolve(__dirname, "../..");
const IMAGE = resolve(ROOT, "public/og-default.jpg");

describe("default social share card", () => {
  it("is 1200×630 as the social networks expect", async () => {
    const meta = await sharp(IMAGE).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe("jpeg");
  });

  it("stays small enough to be fetched on every share", () => {
    const kb = statSync(IMAGE).size / 1024;
    expect(kb).toBeLessThan(200);
    expect(kb).toBeGreaterThan(20);
  });

  it("is the image referenced by the homepage and by the seo helper", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    expect(html).toContain(
      'property="og:image" content="https://alikhlasmedical.store/og-default.jpg"',
    );
    expect(html).toContain(
      'name="twitter:image" content="https://alikhlasmedical.store/og-default.jpg"',
    );
    const seo = readFileSync(resolve(ROOT, "src/lib/seo.ts"), "utf-8");
    expect(seo).toContain("/og-default.jpg");
  });

  it("keeps a generator script so the card can be rebuilt reproducibly", () => {
    const script = readFileSync(resolve(ROOT, "scripts/generate-og-default.mjs"), "utf-8");
    expect(script).toContain("1200");
    expect(script).toContain("630");
    expect(script).toContain("الإخلاص ميديكال");
    expect(script).toContain("cairo.woff2");
  });
});
