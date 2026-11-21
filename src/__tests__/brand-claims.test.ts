import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const BRAND_SURFACES = [
  "index.html",
  "src/routes/index.tsx",
  "src/lib/seo.ts",
  "src/components/sections/Hero.tsx",
  "src/components/layout/Header.tsx",
];

const DATA_SURFACES = [
  "src/data/landing-pages.ts",
  "src/data/articles.ts",
  "src/data/product-faqs.ts",
  "src/data/products/men.ts",
  "src/data/products/women.ts",
  "src/data/products/devices.ts",
];

const MARKET_CLAIMS = [
  "أفضل شركة",
  "أكبر شركة",
  "الشركة الأولى",
  "رقم 1 في",
  "الأكثر مبيعًا",
  "الأكثر مبيعا",
  "أسطوري",
  "أسطورية",
  "أقوى منتج",
  "أقوى 10",
];

const SUPERLATIVE_COMPANY =
  /(?:أكبر|أفضل|أقوى|الأولى|أول|رقم\s*(?:١|1))\s+شركة|شركة\s+(?:الأولى|الأكبر|الأفضل)/;

describe("company positioning claims", () => {
  it("never claims to be the biggest or the best company", () => {
    for (const relative of BRAND_SURFACES) {
      const source = readFileSync(resolve(ROOT, relative), "utf-8");
      const match = source.match(SUPERLATIVE_COMPANY);
      expect(match?.[0] ?? null, `ادعاء تفوّق في ${relative}`).toBeNull();
    }
  });

  it("keeps the approved, verifiable positioning on the home page", () => {
    // الصيغة المعتمدة تبقى منشورة كما هي في وسم الصفحة (title/description/JSON-LD)
    const home = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    // العنوان بلا بادئة العلامة عن قصد: Google يعرض اسم الموقع فوقه أصلًا،
    // والبادئة كانت تدفع العنوان إلى 650px فيُقتطع قبل «الزوجية».
    expect(home).toContain("<title>شركة مصرية متخصصة في منتجات الصحة والسعادة الزوجية</title>");
    // اسم العلامة يبقى حاضرًا في بيانات الموقع (og:site_name + JSON-LD)
    expect(home).toContain('content="الإخلاص ميديكال"');
    // وفي الهيرو يبقى الوعد نفسه بكلماته الأساسية (بدون اسم العلامة المكرر
    // لأنه ظاهر أصلاً في الترويسة) — الصيغة المعتمدة: «الصحة والسعادة الزوجية بخصوصية كاملة».
    const hero = readFileSync(resolve(ROOT, "src/components/sections/Hero.tsx"), "utf-8");
    expect(hero).toContain("الصحة والسعادة الزوجية");
    expect(hero).toContain("بخصوصية كاملة");
  });
});

describe("marketing claims in data sources", () => {
  it("لا ادعاء قيادة سوق أو تفوّق داخل نصوص البيانات", () => {
    for (const relative of DATA_SURFACES) {
      const source = readFileSync(resolve(ROOT, relative), "utf-8");
      for (const claim of MARKET_CLAIMS) {
        expect(source.includes(claim), `«${claim}» في ${relative}`).toBe(false);
      }
    }
  });
});
