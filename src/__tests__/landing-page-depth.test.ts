import { describe, expect, it } from "vitest";
import { seoLandingPages, type SeoLandingPage } from "@/data/landing-pages";

/**
 * ============================================================
 * نظام صفحات الهبوط (Landing Page Content System)
 * ============================================================
 * كل صفحة هبوط جديدة — سواء أُضيفت اليوم أو بعد سنة — تمر من هنا.
 * هذا الملف هو «المواصفة الحيّة»: إذا لم يتحقق شرط، تفشل البوابات
 * قبل النشر. الشروط مبنية على أربعة أهداف تجارية:
 *
 *   1. عمق: صفحة طويلة تُقرأ فعلًا، لا بطاقة قصيرة تعيد كلمات مفتاحية.
 *   2. نية بحث واحدة: كلمة أساسية + كلمات مرتبطة تظهر طبيعيًا في المتن.
 *   3. تفرّد: لا جملة مكررة ولا سؤال مكرر بين صفحتين (محتوى لا يُنسخ).
 *   4. أمان: لا سعر مكتوب، لا وعد علاجي، والتحذيرات ومتى تراجع مختصًا.
 */

const MIN_BODY_WORDS = 1300;
const MIN_SECTIONS = 7;
const MIN_SECTION_WORDS = 140;
const MIN_PARAGRAPHS_PER_SECTION = 2;
const MIN_PARAGRAPH_WORDS = 30;
const MIN_BULLETS_PER_SECTION = 3;
const MIN_OPENING_WORDS = 28;
const MIN_FAQS = 6;
const MIN_FAQ_ANSWER_WORDS = 30;
const MAX_FAQ_ANSWER_WORDS = 95;
const MIN_TAKEAWAYS = 4;
const MAX_SENTENCE_WORDS = 48;
const MAX_AVG_SENTENCE_WORDS = 32;
const MAX_PARAGRAPH_WORDS = 150;
const MIN_PRIMARY_KEYWORD_HITS = 4;
const MIN_RELATED_KEYWORDS_PRESENT = 3;
const SHINGLE_SIZE = 9;

const words = (text: string): string[] =>
  text
    .replace(/[\u200f\u200e«»"()،؛:]/g, " ")
    .split(/\s+/)
    .filter((token) => token.trim().length > 0);

const wordCount = (text: string): number => words(text).length;

/** نص المتن كما يراه القارئ: كل الفقرات والنقاط والجداول والأسئلة. */
const bodyText = (page: SeoLandingPage): string =>
  [
    page.heroDescription,
    page.intro,
    ...(page.keyTakeaways ?? []),
    ...page.sections.flatMap((section) => [
      section.heading,
      section.body,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]),
    ...(page.comparison
      ? [page.comparison.caption, ...page.comparison.columns, ...page.comparison.rows.flat()]
      : []),
    ...page.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ...page.links.flatMap((link) => [link.label, link.description]),
  ].join("\n");

/** كل نص الصفحة (المتن + الميتا) — للكلمات المفتاحية والحرّاس. */
const fullText = (page: SeoLandingPage): string =>
  [page.title, page.metaTitle, page.metaDescription, bodyText(page)].join("\n");

const paragraphsOf = (page: SeoLandingPage): string[] => [
  page.heroDescription,
  page.intro,
  ...(page.keyTakeaways ?? []),
  ...page.sections.flatMap((section) => [
    section.body,
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []),
  ]),
  ...page.faqs.map((faq) => faq.answer),
];

const sentences = (text: string): string[] =>
  text
    .split(/[.؟!؟\n]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => wordCount(sentence) >= 3);

const normalize = (text: string): string =>
  text
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const shingles = (text: string): Set<string> => {
  const tokens = normalize(text).split(" ").filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + SHINGLE_SIZE <= tokens.length; i++) {
    set.add(tokens.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return set;
};

describe.each(seoLandingPages.map((page) => [page.slug, page] as const))(
  "نظام صفحات الهبوط — %s",
  (slug, page) => {
    it("محتوى طويل فعليًا: عمق المتن والأقسام والفقرات", () => {
      expect(wordCount(bodyText(page)), `${slug}: عمق المتن`).toBeGreaterThanOrEqual(
        MIN_BODY_WORDS,
      );
      expect(page.sections.length, `${slug}: عدد الأقسام`).toBeGreaterThanOrEqual(MIN_SECTIONS);
      for (const section of page.sections) {
        const sectionWords = wordCount(
          [section.body, ...(section.paragraphs ?? []), ...(section.bullets ?? [])].join(" "),
        );
        expect(sectionWords, `${slug}/${section.heading}: كلمات القسم`).toBeGreaterThanOrEqual(
          MIN_SECTION_WORDS,
        );
        expect(
          wordCount(section.body),
          `${slug}/${section.heading}: فقرة الافتتاح`,
        ).toBeGreaterThanOrEqual(MIN_OPENING_WORDS);
        expect(
          (section.paragraphs ?? []).length,
          `${slug}/${section.heading}: فقرات التوسّع`,
        ).toBeGreaterThanOrEqual(MIN_PARAGRAPHS_PER_SECTION);
        for (const paragraph of section.paragraphs ?? [])
          expect(
            wordCount(paragraph),
            `${slug}/${section.heading}: فقرة قصيرة جدًا`,
          ).toBeGreaterThanOrEqual(MIN_PARAGRAPH_WORDS);
        expect(
          (section.bullets ?? []).length,
          `${slug}/${section.heading}: نقاط عملية`,
        ).toBeGreaterThanOrEqual(MIN_BULLETS_PER_SECTION);
      }
    });

    it("بنية تحويل واضحة: أهم النقاط + جدول مقارنة + أسئلة كافية", () => {
      expect(page.keyTakeaways?.length ?? 0, `${slug}: أهم النقاط`).toBeGreaterThanOrEqual(
        MIN_TAKEAWAYS,
      );
      expect(page.keyTakeaways?.length ?? 0, `${slug}: أهم النقاط (سقف)`).toBeLessThanOrEqual(6);
      for (const point of page.keyTakeaways ?? [])
        expect(wordCount(point), `${slug}: نقطة مبتورة`).toBeGreaterThanOrEqual(8);

      expect(page.comparison, `${slug}: جدول المقارنة مطلوب`).toBeTruthy();
      const comparison = page.comparison!;
      expect(comparison.columns.length, `${slug}: أعمدة الجدول`).toBeGreaterThanOrEqual(3);
      expect(comparison.rows.length, `${slug}: صفوف الجدول`).toBeGreaterThanOrEqual(3);
      for (const row of comparison.rows) {
        expect(row.length, `${slug}: صف ناقص في الجدول (${row[0]})`).toBe(
          comparison.columns.length,
        );
        for (const cell of row)
          expect(cell.trim().length, `${slug}: خلية فارغة`).toBeGreaterThan(0);
      }

      expect(page.faqs.length, `${slug}: عدد الأسئلة`).toBeGreaterThanOrEqual(MIN_FAQS);
      for (const faq of page.faqs) {
        const length = wordCount(faq.answer);
        expect(length, `${slug}/${faq.question}: إجابة قصيرة`).toBeGreaterThanOrEqual(
          MIN_FAQ_ANSWER_WORDS,
        );
        expect(length, `${slug}/${faq.question}: إجابة طويلة جدًا`).toBeLessThanOrEqual(
          MAX_FAQ_ANSWER_WORDS,
        );
      }
    });

    it("نية بحث واحدة: الكلمة الأساسية والمرتبطة داخل المتن لا في الميتا فقط", () => {
      const text = normalize(bodyText(page));
      const hits = text.split(normalize(page.primaryKeyword)).length - 1;
      expect(hits, `${slug}: تكرار «${page.primaryKeyword}» في المتن`).toBeGreaterThanOrEqual(
        MIN_PRIMARY_KEYWORD_HITS,
      );
      const present = page.relatedKeywords.filter((keyword) => text.includes(normalize(keyword)));
      expect(
        present.length,
        `${slug}: كلمات مرتبطة مفقودة (${page.relatedKeywords.join(" / ")})`,
      ).toBeGreaterThanOrEqual(MIN_RELATED_KEYWORDS_PRESENT);

      const head = normalize(
        [page.title, page.metaTitle, page.metaDescription, page.heroDescription].join(" "),
      );
      const inHead =
        head.includes(normalize(page.primaryKeyword)) ||
        page.relatedKeywords.some((keyword) => head.includes(normalize(keyword)));
      expect(inHead, `${slug}: الكلمة الأساسية غائبة عن العنوان والوصف`).toBe(true);
    });

    it("لغة بشرية: جُمل متوسطة الطول وفقرات قابلة للقراءة", () => {
      const all = sentences(bodyText(page));
      expect(all.length, `${slug}: عدد الجمل`).toBeGreaterThan(40);
      const average = all.reduce((sum, sentence) => sum + wordCount(sentence), 0) / all.length;
      expect(average, `${slug}: متوسط طول الجملة`).toBeLessThanOrEqual(MAX_AVG_SENTENCE_WORDS);
      const longest = all.reduce(
        (max, sentence) => (wordCount(sentence) > wordCount(max) ? sentence : max),
        "",
      );
      expect(
        wordCount(longest),
        `${slug}: جملة طويلة جدًا (${longest.slice(0, 40)}…)`,
      ).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
      for (const paragraph of paragraphsOf(page))
        expect(wordCount(paragraph), `${slug}: فقرة طويلة جدًا`).toBeLessThanOrEqual(
          MAX_PARAGRAPH_WORDS,
        );
    });

    it("لا جملة مكررة داخل الصفحة نفسها", () => {
      const seen = new Map<string, number>();
      for (const sentence of sentences(bodyText(page))) {
        const key = normalize(sentence);
        if (wordCount(key) < 8) continue;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const repeated = [...seen.entries()].filter(([, count]) => count > 1);
      expect(repeated, `${slug}: جمل مكررة داخليًا`).toEqual([]);
    });

    it("أمان المحتوى: لا سعر، لا وعد علاجي، والتحذيرات حاضرة", () => {
      const text = fullText(page);
      expect(text, `${slug}: سعر مكتوب باليد`).not.toMatch(/\d+\s*(?:ج\.م|جنيه|جنية|EGP)/);
      // الوعد الممنوع = عبارة تسويقية داخل جملة غير منفيّة.
      // النفي («لا يوجد ... مضمون») تحذير مشروع ولا يُحسب مخالفة.
      const promises = [
        "يعالج",
        "يشفي",
        "علاج نهائي",
        "مضمون",
        "بدون أعراض",
        "بدون أي أعراض",
        "مئة بالمئة",
        "100%",
        "أفضل منتج",
        "أقوى منتج",
      ];
      const NEGATION = /(?:^|\s)(?:لا|ليس|ليست|غير|بدون|دون|ممنوع|تجنب|تجنّب|لم|لن|ولا)(?:\s|$)/;
      const violations: string[] = [];
      for (const sentence of text.split(/[.؟!\n]+/)) {
        if (NEGATION.test(sentence)) continue;
        for (const promise of promises)
          if (sentence.includes(promise))
            violations.push(`${promise} ← ${sentence.trim().slice(0, 40)}…`);
      }
      expect(violations, `${slug}: وعود ممنوعة`).toEqual([]);

      expect(text, `${slug}: لا إحالة لمختص`).toContain("مختص");
      expect(text, `${slug}: لا إشارة توقف`).toMatch(/يُوقف|توقف|التوقف|أوقف/);
      expect(text, `${slug}: لا إشارة أعراض`).toMatch(/ألم|احمرار|تهيج|حساسية/);
    });

    it("مصادر ومصدر تحديث وروابط داخلية سليمة", () => {
      expect((page.sources ?? []).length, `${slug}: عدد المصادر`).toBeGreaterThanOrEqual(2);
      for (const source of page.sources ?? []) {
        expect(source.url, `${slug}: مصدر بلا https`).toMatch(/^https:\/\//);
        expect(source.publisher.length, `${slug}: مصدر بلا جهة`).toBeGreaterThan(2);
      }
      expect(page.updatedAt, `${slug}: تاريخ تحديث`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.links.length, `${slug}: روابط داخلية`).toBeGreaterThanOrEqual(2);
      for (const link of page.links) {
        expect(link.href, `${slug}: رابط خارجي`).toMatch(/^\//);
        expect(wordCount(link.description), `${slug}: وصف رابط قصير`).toBeGreaterThanOrEqual(4);
      }
    });
  },
);

describe("نظام صفحات الهبوط — تفرّد بين الصفحات", () => {
  it("لا مقاطع متطابقة (9 كلمات) بين أي صفحتين", () => {
    const bySlug = new Map(
      seoLandingPages.map((page) => [page.slug, shingles(bodyText(page))] as const),
    );
    const collisions: string[] = [];
    for (let i = 0; i < seoLandingPages.length; i++) {
      for (let j = i + 1; j < seoLandingPages.length; j++) {
        const a = seoLandingPages[i];
        const b = seoLandingPages[j];
        const shared = [...bySlug.get(a.slug)!].filter((shingle) =>
          bySlug.get(b.slug)!.has(shingle),
        );
        if (shared.length > 0) collisions.push(`${a.slug} ↔ ${b.slug}: ${shared[0]}`);
      }
    }
    expect(collisions, `محتوى مكرر بين الصفحات:\n${collisions.join("\n")}`).toEqual([]);
  });

  it("لا سؤال مكرر ولا إجابة مكررة بين صفحتين", () => {
    const questions = seoLandingPages.flatMap((page) =>
      page.faqs.map((faq) => `${page.slug}::${normalize(faq.question)}`),
    );
    const answers = seoLandingPages.flatMap((page) =>
      page.faqs.map((faq) => `${page.slug}::${normalize(faq.answer)}`),
    );
    const duplicate = (list: string[]) => {
      const seen = new Set<string>();
      const dup: string[] = [];
      for (const item of list) {
        const key = item.split("::")[1];
        if (seen.has(key)) dup.push(item);
        seen.add(key);
      }
      return dup;
    };
    expect(duplicate(questions), "أسئلة مكررة").toEqual([]);
    expect(duplicate(answers), "إجابات مكررة").toEqual([]);
  });

  it("لا عنوان قسم مكرر بين صفحتين", () => {
    const headings = seoLandingPages.flatMap((page) =>
      page.sections.map((section) => `${page.slug}::${normalize(section.heading)}`),
    );
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const heading of headings) {
      const key = heading.split("::")[1];
      if (seen.has(key)) dup.push(heading);
      seen.add(key);
    }
    expect(dup, "عناوين أقسام مكررة").toEqual([]);
  });

  it("كل صفحة تستهدف كلمة أساسية مختلفة", () => {
    const keywords = seoLandingPages.map((page) => normalize(page.primaryKeyword));
    expect(new Set(keywords).size, "كلمة أساسية مكررة").toBe(keywords.length);
  });
});
