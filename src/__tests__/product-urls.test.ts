import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { products } from "@/data/products";

/**
 *
 * قاعدة المالك: لكل منتج **رابط واحد نهائي** — لا روابط قديمة ولا تحويلات،
 * والرابط مكتوب بكلمات مفهومة فقط: اسم المنتج وشكله وحجمه، بلا رموز داخلية
 * (m/w/d) وبلا أكواد.
 */
const ROOT = resolve(__dirname, "../..");
const SITE = "https://alikhlasmedical.store";

describe("روابط المنتجات", () => {
  it("كل رابط حروف لاتينية صغيرة وأرقام وشرطات فقط", () => {
    for (const product of products) {
      expect(product.slug, product.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(product.slug.length, product.id).toBeLessThanOrEqual(48);
    }
  });

  it("الروابط بلا رموز داخلية (m/w/d) وبلا أرقام أكواد", () => {
    for (const product of products) {
      expect(product.slug, product.id).not.toMatch(/-(m|w|d)\d{2}(-|$)/);
      expect(product.slug, product.id).not.toMatch(/\b(m|w|d)\d{2}\b/);
    }
  });

  it("لا يوجد رابطان متطابقان في الكتالوج", () => {
    const slugs = products.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("لا يوجد أي توجيه (redirect) لمسارات المنتجات", () => {
    const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8")) as {
      redirects?: Array<{ source: string }>;
    };
    const productRedirects = (vercel.redirects ?? []).filter((rule) =>
      rule.source.startsWith("/products"),
    );
    expect(productRedirects).toEqual([]);
  });

  it("خريطة الموقع تحتوي رابطًا واحدًا لكل منتج، بلا تكرار", () => {
    const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
    const productUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1])
      .filter((url) => {
        const path = new URL(url).pathname.split("/").filter(Boolean);
        // صفحات الأقسام وفهرس الأدلة وجدول الأسعار ليست منتجات: /products/guides
        // و/products/prices صفحات مجموعة لا صفحات منتج، فتُستثنى من العدّ.
        const reserved = new Set(["men", "women", "devices", "guides", "prices"]);
        return path.length === 2 && path[0] === "products" && !reserved.has(path[1]);
      });
    expect(productUrls.length).toBe(products.length);
    expect(new Set(productUrls).size).toBe(products.length);
    for (const product of products) {
      expect(productUrls, product.slug).toContain(`${SITE}/products/${product.slug}`);
    }
  });
});
