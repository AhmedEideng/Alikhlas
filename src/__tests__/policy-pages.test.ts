import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { POLICY_UPDATED_AT, getPolicyPage, policyPages } from "@/data/policy-pages";
import { POLICY_META, EDUCATION_META } from "@/data/policy-meta";
import {
  POLICY_LINK_TOKENS,
  formatPolicyDate,
  policySegments,
  policyText,
  type PolicyPage,
} from "@/lib/policy-format";
import { educationHub } from "@/data/education-hub";
import { FREE_SHIPPING_THRESHOLD, GOVERNORATE_SHIPPING } from "@/lib/site-config";
import { formatPrice } from "@/data/product-types";

const ROOT = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const EXPECTED = {
  shipping: { path: "/shipping", minWords: 600 },
  returns: { path: "/returns", minWords: 600 },
  privacy: { path: "/privacy", minWords: 600 },
  terms: { path: "/terms", minWords: 600 },
  contact: { path: "/contact", minWords: 600 },
} as const;

/** كل نص ظاهر في صفحة واحدة (فقرات + نقاط) بعد استبدال رموز القيم. */
function visibleText(page: PolicyPage): string {
  return page.sections
    .flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ])
    .map((text) => policyText(text))
    .join("\n");
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** جُمل مفصولة بعلامات الوقف — لحراسة التكرار بين الصفحات. */
function sentences(page: PolicyPage): string[] {
  return visibleText(page)
    .split(/[.؟!]+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => words(sentence) >= 8);
}

describe("صفحات الثقة والسياسات — مصدر واحد ونصوص طويلة", () => {
  it("خمس صفحات فقط، بمسارات معروفة وبلا تكرار", () => {
    expect(policyPages).toHaveLength(5);
    expect(new Set(policyPages.map((page) => page.slug)).size).toBe(5);
    expect(new Set(policyPages.map((page) => page.path)).size).toBe(5);
    for (const [slug, meta] of Object.entries(EXPECTED)) {
      const page = getPolicyPage(slug as keyof typeof EXPECTED);
      expect(page.path).toBe(meta.path);
      expect(page.updatedAt).toBe(POLICY_UPDATED_AT);
    }
  });

  it.each(Object.keys(EXPECTED))("صفحة %s نصها طويل ومقسم لأقسام حقيقية", (slug) => {
    const page = getPolicyPage(slug as keyof typeof EXPECTED);
    const expected = EXPECTED[slug as keyof typeof EXPECTED];

    expect(words(visibleText(page))).toBeGreaterThanOrEqual(expected.minWords);
    expect(page.sections.length).toBeGreaterThanOrEqual(6);

    for (const section of page.sections) {
      expect(section.heading.trim().length).toBeGreaterThan(4);
      const body = [...(section.paragraphs ?? []), ...(section.bullets ?? [])];
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(words(body.map(policyText).join(" "))).toBeGreaterThanOrEqual(45);
    }
  });

  it("العناوين والوصف التعريفي داخل حدود محركات البحث", () => {
    for (const page of policyPages) {
      expect(page.metaTitle.length).toBeLessThanOrEqual(62);
      expect(page.metaDescription.length).toBeLessThanOrEqual(155);
      expect(page.metaDescription.length).toBeGreaterThanOrEqual(70);
      expect(page.metaTitle).toContain("الإخلاص ميديكال");
      expect(page.heroDescription.length).toBeGreaterThanOrEqual(60);
      expect(page.metaTitle).not.toMatch(/[!]{1}/u);
    }
  });

  it("لا جملة واحدة مشتركة بين صفحتين ولا مكررة داخل الصفحة", () => {
    const seen = new Map<string, string>();
    for (const page of policyPages) {
      const own = new Set<string>();
      for (const sentence of sentences(page)) {
        expect(own.has(sentence), `جملة مكررة داخل ${page.slug}: ${sentence}`).toBe(false);
        own.add(sentence);
        const previous = seen.get(sentence);
        expect(previous, `جملة مشتركة بين ${page.slug} و${previous}: ${sentence}`).toBeUndefined();
        seen.set(sentence, page.slug);
      }
    }
  });

  it("الحقائق المُلزمة موجودة في صفحاتها", () => {
    const shipping = policyText(visibleText(getPolicyPage("shipping")));
    expect(shipping).toContain(formatPrice(FREE_SHIPPING_THRESHOLD));
    for (const governorate of GOVERNORATE_SHIPPING) {
      expect(shipping).toContain(governorate.name);
    }
    expect(shipping).toContain("تغليف");
    expect(shipping).toContain("محايد");

    const returns = policyText(visibleText(getPolicyPage("returns")));
    expect(returns).toContain("14 يومًا");
    expect(returns).toContain("7 أيام عمل");
    expect(returns).toContain("غير مفتوح");

    const terms = policyText(visibleText(getPolicyPage("terms")));
    expect(terms).toContain("القانون المصري");
    expect(terms).toMatch(/لا نُقدّم تشخيصًا|لا نقدم تشخيصًا/);

    const privacy = policyText(visibleText(getPolicyPage("privacy")));
    expect(privacy).toContain("حقوقك");
    expect(privacy).toMatch(/HTTPS/);
  });

  it("لا أسعار ولا أرقام مكتوبة باليد — كلها رموز تُحقن من المصدر", () => {
    for (const page of policyPages) {
      const raw = page.sections
        .flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])])
        .join(" ");
      // اسم العملة مسموح («الأسعار بالجنيه المصري») لكن رقم + عملة مكتوب باليد ممنوع
      expect(raw).not.toMatch(/ج\.م/);
      expect(raw).not.toMatch(/\d+\s*(?:جنيه|ج\.م|جنيهًا)/);
      // أي مبلغ مذكور يجب أن يأتي من رمز
      expect(raw.replace(/\{\{[A-Z_]+\}\}/g, "")).not.toMatch(/\d{3,}/);
    }
  });

  it("كل رمز مستخدم معروف، وبعد التحويل لا يتبقى أي {{…}}", () => {
    for (const page of policyPages) {
      for (const section of page.sections) {
        for (const text of [...(section.paragraphs ?? []), ...(section.bullets ?? [])]) {
          const tokens = text.match(/\{\{[A-Z_]+\}\}/g) ?? [];
          for (const token of tokens) {
            const known = token in POLICY_LINK_TOKENS || policyText(token) !== token;
            expect(known, `رمز غير معروف في ${page.slug}: ${token}`).toBe(true);
          }
          for (const segment of policySegments(text)) {
            if (segment.kind === "text") expect(segment.value).not.toMatch(/\{\{|\}\}/);
          }
        }
      }
    }
  });

  it("لا مبالغات ولا وعود طبية في نصوص السياسات", () => {
    const banned = [
      "أفضل",
      "الأفضل في مصر",
      "رقم 1",
      "رقم واحد",
      "أرخص",
      "مضمون 100%",
      "علاج نهائي",
      "يشفي",
      "يعالج",
      "معجزة",
      "بدون أي آثار جانبية",
    ];
    for (const page of policyPages) {
      const text = policyText(visibleText(page));
      for (const phrase of banned) {
        expect(text.includes(phrase), `${page.slug} تحتوي «${phrase}»`).toBe(false);
      }
    }
  });

  it("الـ routes لا تحمل نصًا: تعرض المصدر المشترك فقط", () => {
    for (const slug of Object.keys(EXPECTED)) {
      const source = read(`src/routes/${slug}.tsx`);
      expect(source).toContain(`getPolicyPage("${slug}")`);
      expect(source).toContain(`POLICY_META.${slug}.title`);
      expect(source).toContain('from "@/components/TrustPageView"');
      // النص الطويل يُحمَّل عند فتح الصفحة فقط — لا يدخل المسار الحرج
      expect(source).toContain('await import("@/data/policy-pages")');
      // لا فقرات عربية مكتوبة داخل الـ route (التعليق القصير مسموح)
      const prose = source
        .split("\n")
        .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
        .join(" ")
        .replace(/"[^"]*"/g, "");
      expect(prose).not.toMatch(/[\u0600-\u06FF]{12,}/);
      expect(source.length).toBeLessThan(1000);
    }
  });

  it("مولّد HTML الثابت يستخدم نفس المصدر ولا يعيد كتابة النصوص", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    expect(prerender).toContain('vite.ssrLoadModule("/src/data/policy-pages.ts")');
    expect(prerender).toContain("for (const policyPage of policyMod.policyPages)");
    expect(prerender).toContain("path: policyPage.path");
    expect(prerender).not.toContain("بأي حل يرضيك");
    expect(prerender).not.toContain("يمكنك استلامه بنفسك أو عبر من تنوبه");
    expect(prerender).not.toMatch(/path: "\/(shipping|returns|privacy|terms|contact)",/);
  });
});

describe("مكتبة التوعية — مقدمة حقيقية بدل «قيد الإعداد»", () => {
  it("مقدمة طويلة بأقسام وحدود واضحة", () => {
    const text = educationHub.sections
      .flatMap((section) => [
        section.heading,
        ...(section.paragraphs ?? []),
        ...(section.bullets ?? []),
      ])
      .join(" ");

    expect(words(text)).toBeGreaterThanOrEqual(350);
    expect(educationHub.sections.length).toBeGreaterThanOrEqual(4);
    expect(text).toContain("تشخيص");
    expect(text).toContain("مصادر");
    expect(text).not.toContain("قيد الإعداد");
  });

  it("العنوان والوصف التعريفي داخل الحدود", () => {
    expect(educationHub.metaTitle.length).toBeLessThanOrEqual(62);
    expect(educationHub.metaDescription.length).toBeLessThanOrEqual(155);
    expect(educationHub.metaDescription.length).toBeGreaterThanOrEqual(70);
  });

  it("المولّد والـ route يرسمان المقدمة من نفس المصدر", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    expect(prerender).toContain('vite.ssrLoadModule("/src/data/education-hub.ts")');
    expect(prerender).toContain("sectionsHtml(educationMod.educationHub.sections)");
    expect(prerender).not.toContain("مكتبة المقالات قيد الإعداد");

    const route = read("src/routes/education.tsx");
    expect(route).toContain('import("@/data/education-hub")');
    expect(route).toContain("educationHub.sections");
    expect(route).toContain("EDUCATION_META.title");
    expect(route).toContain("EDUCATION_META.description");
  });
});

describe("بيانات <head> موحّدة مع نصوص الصفحات", () => {
  it("كل صفحة سياسة تقرأ عنوانها ووصفها من POLICY_META", () => {
    for (const page of policyPages) {
      const meta = POLICY_META[page.slug];
      expect(page.metaTitle).toBe(meta.title);
      expect(page.metaDescription).toBe(meta.description);
    }
  });

  it("مقدمة التوعية تقرأ وصفها من EDUCATION_META", () => {
    expect(educationHub.metaTitle).toBe(EDUCATION_META.title);
    expect(educationHub.metaDescription).toBe(EDUCATION_META.description);
  });
});

describe("تاريخ التحديث ثابت في الواجهة والزاحف", () => {
  it("يُعرض بصيغة عربية مقروءة لا بصيغة ISO مقلوبة", () => {
    expect(formatPolicyDate(POLICY_UPDATED_AT)).toBe("18 نوفمبر 2026");
    expect(formatPolicyDate("2026-01-05")).toBe("5 يناير 2026");
    expect(formatPolicyDate(POLICY_UPDATED_AT)).not.toContain("-");
  });

  it("الـ prerender يطبع نفس السطر قبل الأقسام", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    expect(prerender).toContain("policyFormat.formatPolicyDate(policyPage.updatedAt)");
  });
});
