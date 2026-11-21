import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getProductById,
  getBundleProductType,
  getOralSolidForm,
  getCrossSellsForProduct,
  products,
  searchAllPublicProducts,
} from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { PRODUCT_META_PROFILES } from "@/data/product-meta";

const product = (id: string) => getProductById(id)!;

describe("women's gum wording and owner-confirmed Marcin form", () => {
  it("uses affirmative one-piece wording without removing essential precautions", () => {
    for (const id of ["w-10", "w-11", "w-13", "w-21"]) {
      const usage = product(id).usage!;
      expect(usage, id).toContain("امضغي قطعة واحدة فقط");
      expect(usage, id).toContain("30-60 دقيقة");
      expect(usage, id).not.toMatch(/لا تتجاوزي|قطعتين/);
      expect(usage, id).toMatch(/الحمل|للحامل/);
      // (Round 8) ممنوع إحالة الطبيب/الصيدلي في نسخ المنتج — التحذير نفسه باقٍ.
      expect(usage, id).not.toMatch(/استشير|الطبيب|الصيدلي|النشرة/);
    }
    for (const id of ["w-10", "w-11", "w-13"]) {
      expect(product(id).usage, id).toContain("توقّفي");
      expect(product(id).price, id).toBe(230);
    }
    expect(product("w-11").usage).toContain("أمراض مزمنة");
    // (Round 8) صيغة التحذير وُحّدت: «تناول أدوية» بدل «تتناولين أدوية» — نفس المعنى بلا مخاطبة شخصية.
    expect(product("w-21").usage).toContain("تناول أدوية");
  });

  it("presents and searches Marcin as gum while preserving its URL, price and stock", () => {
    const marcin = product("w-21");
    // والسعر والمخزون كما هما، والاسم ما زال يبدأ بكلمة «لبان» حتى يظل الشكل
    // (علكة/لبان) مقروءًا في البحث.
    // إلى الاسم؛ الحارس على الشكل («لبان») والرابط والسعر والمخزون كما هو.
    expect(marcin.name).toBe("لبان مارسين بالكرز الفاخر للنساء (Marcin Cherry)");
    expect(marcin).toMatchObject({ slug: "marcin-cherry-women-gum", price: 180, stock: 5000 });
    expect(marcin.description).toContain("علكة مارسين");
    expect(marcin.description).not.toContain("أقراص");
    expect(marcin.ingredients).not.toContain("للقرص");
    expect(marcin.benefits[0]).toContain("لبان للمضغ");
    expect(PRODUCT_META_PROFILES[marcin.id].hook).toContain("لبان للمضغ");
    expect(getProductFAQs(marcin)[0].answer).toContain("لبان للمضغ");
    expect(getBundleProductType(marcin)).toBe("gum");
    expect(getOralSolidForm(marcin)).toBeNull();
    for (const term of ["مارسين لبان", "علكة مارسين"]) {
      expect(searchAllPublicProducts(term)[0]?.id, term).toBe("w-21");
    }
  });

  // حرفيًا لمتجر منافس (5-grams = 100%) فأُعيدت صياغته بنفس المعنى والتعليمات.
  it("updates SexLove wording and preserves every previously approved bundle", () => {
    expect(product("w-06").usage).toBe(
      "امضغي علكة واحدة قبل العلاقة بعشر إلى عشرين دقيقة، واشربي ماءً كافيًا بعدها. قطعة واحدة في المرة، وبلا استخدام في الحمل والرضاعة أو عند حساسية معروفة من أحد المكوّنات، وأوقفي الاستخدام عند ظهور أي أثر جانبي.",
    );
    // المنتج، فمحرّك الاقتراحات (الذي يفضّل نفس الشكل) أعاد ترتيب بعض القوائم —
    // البصمة اتحدّثت عن قصد، والعدد/البنية لم يتغيّرا.
    // الباقات في فئة الرجال (89 → 91 منتجًا) — البصمة اتحدّثت عن قصد أيضًا،
    // وكل باقة لا تزال 3 منتجات بلا تكرار.
    // ودخل مرشحي العسل — إعادة ترتيب مقصودة، والعدد 3 لكل باقة كما هو.
    // اقتراحان فقط بدل ثلاثة (بلا أعضاء محذوفين في أي باقة) — البصمة اتحدّثت
    // عن قصد، وكل اقتراح لا يزال من نفس القسم وبلا تكرار.
    const bundles: [string, string[]][] = products.map((p) => [
      p.id,
      getCrossSellsForProduct(p).map((item) => item.id),
    ]);
    const existingIds = new Set<string>(products.map((p) => p.id));
    for (const [mainId, members] of bundles) {
      expect(existingIds.has(mainId)).toBe(true);
      for (const member of members) {
        expect(existingIds.has(member), `${mainId} -> ${member}`).toBe(true);
        expect(member).not.toBe(mainId);
      }
      expect(new Set(members).size).toBe(members.length);
    }
    // آخر تحديث مقصود للبصمة: المناديل (m-29 وw-23) خرجت من كل العروض وصفحاتها
    // بلا باقة أصلًا، وعروض الأجهزة صارت الجهاز + منتجين رجالي بدل ثلاثة أجهزة
    // (قرار المالك في الجولة 33).
    expect(createHash("sha256").update(JSON.stringify(bundles)).digest("hex")).toBe(
      "5723bb1d388a7461f51d1f8f4d46d43521b4317f246cc87094acc65cf443e536",
    );
  });
});
