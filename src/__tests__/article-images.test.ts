import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { articles } from "@/data/articles";
import { ogArticleImage } from "@/data/og-articles.generated";

/**
 * بلا نص بديل وصفي، أو مكسورة، أو غير موجودة في خريطة الصور. هذا الاختبار
 * يضمن الشروط التي يقيسها Google فعليًا — لا الشكل فقط:
 *  • الملف موجود على القرص وبحجم معقول.
 *  • النسخ المصغّرة (thumbs) وصورة المشاركة 1200×630 موجودة.
 *  • alt وصفي (٣٠–١٦٠ حرفًا) لا تكرار للعنوان ولا إيموجي.
 *  • الروابط موجودة في sitemap-images.xml.
 */
const ROOT = resolve(__dirname, "../..");
const PUBLIC = resolve(ROOT, "public");

const withImages = articles.filter((article) => article.image);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe("صور المقالات، الجودة التي يقيسها جوجل", () => {
  it("كل مقال له صورة (لا بطاقة بلا وسيط بصري)", () => {
    expect(withImages.length).toBe(articles.length);
  });

  for (const article of withImages) {
    describe(article.slug, () => {
      const image = article.image as string;
      const file = resolve(PUBLIC, image.replace(/^\//, "").split("?")[0]);

      it("ملف الصورة موجود وبحجم منطقي (٥-٣٠٠ ك.ب)", () => {
        expect(existsSync(file), `${image} غير موجود`).toBe(true);
        const kb = statSync(file).size / 1024;
        expect(kb).toBeGreaterThan(5);
        expect(kb).toBeLessThan(300);
      });

      it("النسخ المصغّرة الثلاث موجودة (240/360/480)", () => {
        for (const dir of ["thumbs-120", "thumbs-180", "thumbs"]) {
          const thumb = resolve(
            PUBLIC,
            image.replace(/^\//, "").replace("/images/", `/images/${dir}/`),
          );
          expect(existsSync(thumb), `${dir} مفقود`).toBe(true);
        }
      });

      it("صورة المشاركة 1200×630 موجودة", () => {
        const og = ogArticleImage(article.slug);
        expect(og, "slug غير مسجّل في og-articles.generated").not.toBeNull();
        expect(existsSync(resolve(PUBLIC, (og as string).replace(/^\//, "")))).toBe(true);
      });

      it("alt وصفي ٣٠-١٦٠ حرفًا، بلا إيموجي، ولا يكرّر العنوان حرفيًا", () => {
        const alt = (article.imageAlt ?? "").trim();
        expect(alt.length).toBeGreaterThanOrEqual(30);
        expect(alt.length).toBeLessThanOrEqual(160);
        expect(alt).not.toBe(article.title);
        expect(EMOJI.test(alt)).toBe(false);
      });
    });
  }

  it("كل صورة مقال مُدرجة في خريطة الصور مع عنوان", () => {
    const sitemapPath = resolve(PUBLIC, "sitemap-images.xml");
    expect(existsSync(sitemapPath)).toBe(true);
    const xml = readFileSync(sitemapPath, "utf-8");
    for (const article of withImages) {
      expect(xml).toContain(`/education/${article.slug}</loc>`);
      expect(xml).toContain((article.image as string).split("?")[0]);
    }
  });
});
