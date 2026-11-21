import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aboutPage } from "@/data/about-content";
import { POLICY_META } from "@/data/policy-meta";
import { reviewBoardPage } from "@/data/review-board-content";
import { policyText, type TrustPage } from "@/lib/policy-format";
import {
  FREE_SHIPPING_THRESHOLD,
  GOVERNORATE_SHIPPING,
  MEDICAL_SUPERVISOR,
  RETURN_WINDOW_DAYS,
  SHIPPING_DELIVERY_TEXT,
} from "@/lib/site-config";
import { PRODUCT_COUNT } from "@/data/product-cards";
import { formatPrice } from "@/data/product-types";

const ROOT = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** كل نص ظاهر في الصفحة بعد استبدال الرموز. */
function visibleText(page: TrustPage): string {
  return [
    page.title,
    page.heroDescription,
    ...(page.stats ?? []).map((stat) => `${stat.value} ${stat.label}`),
    ...page.sections.flatMap((section) => [
      section.heading,
      ...(section.intro ? [section.intro] : []),
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
      ...(section.cards ?? []).flatMap((card) => [card.title, card.meta ?? "", card.text]),
    ]),
  ]
    .map((text) => policyText(text))
    .join("\n");
}

const PAGES = [
  ["about", aboutPage],
  ["medical-review-board", reviewBoardPage],
] as const;

/**
 * وشفافية المحتوى 23.4%). وجود أي واحدة منها مرة أخرى = ارتداد للنص المشترك.
 */
const SHARED_SENTENCES = [
  "انطلقت الإخلاص ميديكال لحل مشكلة حقيقية",
  "بأي حل يرضيك",
  "نعمل على مراجعة مصادر التوريد ووصف المنتجات",
  "تغليف محايد لا يدل على المحتوى",
  "فريق دعم متاح على واتساب للإجابة على أسئلتك",
  "كل منتج مصنّف (أخضر/أصفر/أحمر) بناءً على مكوناته",
  "الخطوات الحقيقية كما تتم فعلًا",
  "حيوية روابط المصادر، موثوقية النطاقات",
  "نرحب بملاحظاتك. إذا وجدت معلومة طبية غير دقيقة",
  "نعتمد على مصادر طبية عالمية موثوقة ومحكّمة",
  "نلتزم بمعايير Google E-E-A-T",
  "يعمل خلف الإخلاص ميديكال فريق متكامل",
  "توفير منتجات صحة زوجية أصلية وموثوقة لكل مصري",
  "أن نكون المرجع الأول في العالم العربي",
];

describe("من نحن وشفافية المحتوى، نص أصلي طويل بمصدر واحد", () => {
  it.each(PAGES)("صفحة %s نصها كافٍ ومقسم لأقسام حقيقية", (_slug, page) => {
    const text = visibleText(page);

    expect(words(text)).toBeGreaterThanOrEqual(600);
    expect(page.sections.length).toBeGreaterThanOrEqual(6);
    expect(page.heroDescription.length).toBeGreaterThanOrEqual(60);

    for (const section of page.sections) {
      expect(section.heading.trim().length).toBeGreaterThan(4);
      const body = [
        ...(section.intro ? [section.intro] : []),
        ...(section.paragraphs ?? []),
        ...(section.bullets ?? []),
        ...(section.cards ?? []).map((card) => card.text),
      ];
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(words(body.map(policyText).join(" "))).toBeGreaterThanOrEqual(40);
    }
  });

  it("لا تعود أي جملة من النسخة المشتركة مع الموقع الآخر", () => {
    for (const [slug, page] of PAGES) {
      const text = visibleText(page);
      for (const sentence of SHARED_SENTENCES) {
        expect(text.includes(sentence), `${slug} تحتوي «${sentence}»`).toBe(false);
      }
    }
  });

  it("لا مبالغات ولا ادعاء اعتماد طبي غير موجود", () => {
    const banned = [
      "أفضل متجر",
      "الأول في مصر",
      "رقم 1",
      "معتمد طبيًا",
      "مضمون 100%",
      "علاج نهائي",
      "يشفي",
      "نتائج مضمونة",
    ];
    for (const [slug, page] of PAGES) {
      const text = visibleText(page);
      for (const phrase of banned) {
        expect(text.includes(phrase), `${slug} تحتوي «${phrase}»`).toBe(false);
      }
      // أي ذكر لجذر «يعالج» لازم يكون داخل نفي، لا كوعد
      for (const match of text.matchAll(/يعالج/g)) {
        const before = text.slice(Math.max(0, (match.index ?? 0) - 30), match.index ?? 0);
        expect(/لا /.test(before), `${slug}: «يعالج» خارج سياق النفي، ${before}`).toBe(true);
      }
    }
  });

  it("الأرقام من المصدر: عدد المنتجات والمحافظات ونافذة الشحن والاسترجاع", () => {
    const aboutText = visibleText(aboutPage);

    expect(aboutText).toContain(String(PRODUCT_COUNT));
    expect(aboutText).toContain(String(GOVERNORATE_SHIPPING.length));
    expect(aboutText).toContain(String(RETURN_WINDOW_DAYS));
    expect(aboutText).toContain(SHIPPING_DELIVERY_TEXT);
    expect(aboutText).toContain(formatPrice(FREE_SHIPPING_THRESHOLD));
    expect(aboutPage.stats?.find((stat) => stat.label.includes("الاسترجاع"))?.value).toBe(
      String(RETURN_WINDOW_DAYS),
    );

    // لا رقم يدوي في ملف النص: العدّادات تُستورد، والعدد لا يُكتب حرفيًا
    const source = read("src/data/about-content.ts");
    expect(source).toContain("PRODUCT_COUNT");
    expect(source).toContain("GOVERNORATE_SHIPPING.length");
    expect(source).toContain("RETURN_WINDOW_DAYS");
    expect(source).not.toMatch(/"\d+"\s*,\s*label:\s*"محافظة/);
  });

  it("لا يتبقى أي رمز {{…}} في النص الظاهر", () => {
    for (const [slug, page] of PAGES) {
      expect(visibleText(page), slug).not.toMatch(/\{\{|\}\}/);
    }
  });

  it("تاريخ المراجعة ظاهر ومقروء على الصفحتين", () => {
    for (const [slug, page] of PAGES) {
      expect(page.updatedAt, slug).toBe("2026-11-18");
    }
  });

  it("المراجعة الطبية مذكورة بالاسم في الصفحتين", () => {
    for (const [slug, page] of PAGES) {
      expect(visibleText(page), slug).toContain(MEDICAL_SUPERVISOR.name);
    }
  });

  it("عنوان ووصف كل صفحة داخل حدود محركات البحث", () => {
    for (const slug of ["about", "medical-review-board"] as const) {
      const meta = POLICY_META[slug];
      expect(meta.title.length).toBeLessThanOrEqual(62);
      expect(meta.description.length).toBeLessThanOrEqual(155);
      expect(meta.description.length).toBeGreaterThanOrEqual(70);
    }
  });

  it("الـ routes رقيقة وتحمّل النص عند فتح الصفحة فقط", () => {
    const aboutRoute = read("src/routes/about.tsx");
    expect(aboutRoute).toContain('import("@/data/about-content")');
    expect(aboutRoute).toContain("POLICY_META.about.title");
    expect(aboutRoute.length).toBeLessThan(2600);

    const reviewRoute = read("src/routes/medical-review-board.tsx");
    expect(reviewRoute).toContain('import("@/data/review-board-content")');
    expect(reviewRoute).toContain('POLICY_META["medical-review-board"].title');
    expect(reviewRoute.length).toBeLessThan(2600);
  });

  it("مولّد HTML الثابت يستخدم نفس المصدرين ولا يعيد كتابة النصوص", () => {
    const prerender = read("scripts/prerender-seo.mjs");

    expect(prerender).toContain('vite.ssrLoadModule("/src/data/about-content.ts")');
    expect(prerender).toContain('vite.ssrLoadModule("/src/data/review-board-content.ts")');
    expect(prerender).toContain("aboutMod.aboutPage");
    expect(prerender).toContain("reviewMod.reviewBoardPage");

    for (const sentence of SHARED_SENTENCES) {
      expect(prerender.includes(sentence), `المولّد يحتوي «${sentence}»`).toBe(false);
    }
  });
});
