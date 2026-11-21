import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { productFAQs } from "@/data/product-faqs";
import { seoLandingPages } from "@/data/landing-pages";
import { articleLibrary } from "@/data/articles-content";

/**
 * قرار المالك (الجولة 33): لا ذكر لتخدير موضعي داخل أي منتج.
 *
 * المقصود هو **المصطلح الطبي** نفسه (تخدير / مخدّر / مخدرة)، وقد استُبدل في كل
 * النصوص بتعبير «تقليل الإحساس» مع الحفاظ على نفس المعنى والتحذيرات. أما وصف
 * الأثر نفسه (خدَر، تنميل، فقدان إحساس) فباقٍ كما هو لأنه وصف حالة لا اسم إجراء،
 * ولأنه أساس تحذيرات السلامة في صفحات المنتجات والأجهزة.
 *
 * الاختبار حارس على المصادر لا على الصفحات المبنية، فيمنع رجوع المصطلح من أي
 * تعديل قادم في الكتالوج أو الأسئلة الشائعة أو صفحات الهبوط أو المقالات.
 */

const FORBIDDEN = /تخدير|مخدّر|مخدّرة|مخدرة|مخدر/;

function offenders(label: string, values: (string | undefined)[]) {
  return values
    .filter((value): value is string => Boolean(value))
    .filter((value) => FORBIDDEN.test(value))
    .map((value) => `${label}: ${value.slice(0, 90)}`);
}

describe("no local anesthesia wording in product copy (round 33 owner rule)", () => {
  it("keeps product fields free of the anesthesia term", () => {
    const hits = products.flatMap((product) =>
      offenders(product.id, [
        product.name,
        product.description,
        product.ingredients,
        product.usage,
        ...(product.benefits ?? []),
        ...(product.searchAliases ?? []),
      ]),
    );
    expect(hits).toEqual([]);
  });

  it("keeps product FAQs free of the anesthesia term", () => {
    const hits = productFAQs.flatMap((faq, index) =>
      offenders(`faq#${index}`, [faq.question, faq.answer]),
    );
    expect(hits).toEqual([]);
  });

  it("keeps landing pages and articles free of the anesthesia term", () => {
    const hits = [
      ...offenders("landing-pages", [JSON.stringify(seoLandingPages)]),
      ...offenders("articles", [JSON.stringify(articleLibrary)]),
    ];
    expect(hits).toEqual([]);
  });
});
