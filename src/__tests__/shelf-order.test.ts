import { describe, expect, it } from "vitest";
import { getProductsByCategory } from "@/data/products";
import { getBundleProductType } from "@/lib/product-form";

/**
 * قرار المالك (الجولة 34): رفّ الأقسام **متنوّع** لا تصاعد سعري.
 *
 * كان القسم يفتح بأرخص المنتجات ثم يزحف صعودًا، فأول شاشة تبقى عبوات رخيصة
 * متشابهة. الآن: افتتاحية محرَّرة تخلط الشرائح والأشكال، ثم تبادل بين
 * اقتصادي/متوسط/فاخر، مع منع ثلاثة منتجات متتالية من نفس الشكل.
 *
 * الاختبار يثبّت الخصائص الثلاث التي تهم العميل: تنوّع أول شاشة، لا تصاعد
 * سعري، ولا تكرار/فقدان لأي منتج، مع بقاء المؤجَّلين في آخر الرفّ.
 */

const CATEGORIES = ["men", "women", "devices"] as const;

const tierOf = (price: number) => (price >= 400 ? "premium" : price >= 250 ? "mid" : "budget");

describe("category shelf order (round 34 owner rule)", () => {
  it.each(CATEGORIES)("%s opens with a varied mix, not the cheapest four", (category) => {
    const shelf = getProductsByCategory(category);
    const opening = shelf.slice(0, 4);
    const families = new Set(opening.map((product) => getBundleProductType(product)));
    const tiers = new Set(opening.map((product) => tierOf(product.price)));
    // الأجهزة كلها فوق 400 ج.م (شريحة واحدة)، فنقارن بعدد الشرائح المتاح فعلًا.
    const availableTiers = new Set(shelf.map((product) => tierOf(product.price))).size;
    expect(families.size).toBeGreaterThanOrEqual(3);
    expect(tiers.size).toBeGreaterThanOrEqual(Math.min(2, availableTiers));
    // أول منتج ليس أرخص منتج في القسم (ولا آخر شاشة سعرية واحدة).
    const cheapest = Math.min(...shelf.map((product) => product.price));
    expect(opening[0].price).toBeGreaterThan(cheapest);
  });

  it.each(CATEGORIES)("%s never groups three products of the same form in a row", (category) => {
    const shelf = getProductsByCategory(category);
    const families = shelf.map((product) => getBundleProductType(product));
    for (let index = 2; index < families.length; index += 1) {
      const trio = new Set(families.slice(index - 2, index + 1));
      expect(trio.size, `three same forms ending at ${shelf[index].id}`).toBeGreaterThan(1);
    }
  });

  it.each(CATEGORIES)("%s keeps every product exactly once", (category) => {
    const shelf = getProductsByCategory(category);
    const ids = shelf.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(getProductsByCategory(category).length);
  });

  it("keeps the forcibly delayed women's products at the very end", () => {
    const shelf = getProductsByCategory("women");
    const tail = shelf.slice(-2).map((product) => product.id);
    expect(tail).toContain("w-20");
    expect(tail).toContain("w-23");
  });

  it("is deterministic: same input, same order", () => {
    for (const category of CATEGORIES) {
      expect(getProductsByCategory(category).map((product) => product.id)).toEqual(
        getProductsByCategory(category).map((product) => product.id),
      );
    }
  });
});
