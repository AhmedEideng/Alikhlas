/**
 * 🧩 حارس الرموز: لا يصل `{{TOKEN}}` خام إلى صفحة يراها الزائر أو الزاحف.
 *
 * الحالة التي كشفته المراجعة الشاملة: صفحة `/returns` كانت تعرض
 * `{{RETURN_DAYS}}` و`{{REFUND_DAYS}}` في الـhero — لأن العارض (React) والـprerender
 * كانا يمرّران `heroDescription` كما هو بدل تمريره على `policyText()`.
 * الأقسام كانت سليمة، والرأس وحده كان مكسورًا، فلم يكتشفه أي اختبار قديم.
 *
 * الحماية الآن ثلاثية:
 *   1. بيانات: كل رموز القيم في كل صفحة ثقة/سياسة لها بديل معروف.
 *   2. عرض: العارض والـprerender يمرّران الرأس على `policyText()`.
 *   3. بناء: `scripts/prerender-seo.mjs` يفشل لو بقي أي رمز في أي صفحة منشورة.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { aboutPage } from "@/data/about-content";
import { policyPages } from "@/data/policy-pages";
import { reviewBoardPage } from "@/data/review-board-content";
import { POLICY_LINK_TOKENS, policyText, type TrustPage } from "@/lib/policy-format";

const TOKEN = /\{\{[A-Z0-9_]+\}\}/g;

const pages: TrustPage[] = [...policyPages, aboutPage, reviewBoardPage];
const pathOf = (page: TrustPage, index: number) =>
  "slug" in page ? `/${(page as { slug: string }).slug}` : `page-${index}`;

function fieldsOf(page: TrustPage): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [
    { where: "title", text: page.title },
    { where: "eyebrow", text: page.eyebrow },
    { where: "heroDescription", text: page.heroDescription },
  ];
  for (const stat of page.stats ?? []) {
    out.push({ where: `stat.value:${stat.label}`, text: stat.value });
    out.push({ where: `stat.label:${stat.label}`, text: stat.label });
  }
  for (const section of page.sections) {
    out.push({ where: `h2:${section.heading}`, text: section.heading });
    if (section.intro) out.push({ where: `intro:${section.heading}`, text: section.intro });
    for (const paragraph of section.paragraphs ?? [])
      out.push({ where: `p:${section.heading}`, text: paragraph });
    for (const bullet of section.bullets ?? [])
      out.push({ where: `li:${section.heading}`, text: bullet });
  }
  return out;
}

describe("لا رموز خام في صفحات الثقة والسياسات", () => {
  it("كل رمز في النص له بديل قيمة أو رابط معروف", () => {
    const unknown = new Set<string>();
    for (const [index, page] of pages.entries()) {
      for (const field of fieldsOf(page)) {
        for (const token of field.text.match(TOKEN) ?? []) {
          const isValue = !policyText(token).match(TOKEN);
          const isLink = token in POLICY_LINK_TOKENS;
          if (!isValue && !isLink) unknown.add(`${pathOf(page, index)} ${field.where}: ${token}`);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it("بعد استبدال القيم لا يبقى إلا رموز روابط داخلية معروفة", () => {
    const leftovers: string[] = [];
    for (const [index, page] of pages.entries()) {
      for (const field of fieldsOf(page)) {
        for (const token of policyText(field.text).match(TOKEN) ?? []) {
          if (!(token in POLICY_LINK_TOKENS))
            leftovers.push(`${pathOf(page, index)} ${field.where}: ${token}`);
        }
      }
    }
    expect(leftovers).toEqual([]);
  });

  it("رأس الصفحة نفسه خالٍ من الرموز بعد الاستبدال", () => {
    for (const [index, page] of pages.entries()) {
      expect(
        policyText(page.heroDescription).match(TOKEN),
        `${pathOf(page, index)}: الرأس`,
      ).toBeNull();
    }
  });
});

describe("العارض والـprerender يمرّران الرأس على policyText", () => {
  const view = readFileSync(resolve(process.cwd(), "src/components/TrustPageView.tsx"), "utf-8");
  const prerender = readFileSync(resolve(process.cwd(), "scripts/prerender-seo.mjs"), "utf-8");

  it("TrustPageView يستبدل رموز heroDescription", () => {
    expect(view).toContain("policyText(page.heroDescription)");
  });

  it("prerender يستبدل رموز الرأس لصفحات السياسات وصفحات الثقة", () => {
    expect(prerender).toContain("policyFormat.policyText(policyPage.heroDescription)");
    expect(prerender).toContain("policyFormat.policyText(trustPage.heroDescription)");
  });

  it("البناء يفشل لو بقي أي رمز في صفحة منشورة", () => {
    expect(prerender).toMatch(/رموز غير مُستبدلة|leakedTokens/);
  });
});
