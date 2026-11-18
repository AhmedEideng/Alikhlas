import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getPolicyPage, policyText } from "@/data/policy-pages";
import {
  MEDICAL_SUPERVISOR,
  SHIPPING_DELIVERY_TEXT,
  SHIPPING_DELIVERY_WINDOWS,
} from "@/lib/site-config";

/**
 *
 * 1) نافذة الشحن المعلنة **24–72 ساعة** — لا «24–48» ولا أي وعد يتجاوز 72 ساعة.
 * 2) الإشراف الطبي **د. خالد شاهين** — اسم واحد من مصدر واحد (`site-config`)،
 *    ويظهر في الفوتر وصفحة المنتج وصفحات الثقة.
 *
 * يفشل الاختبار قبل النشر.
 */

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["__tests__", "node_modules"].includes(entry)) continue;
      collectFiles(full, out);
    } else if (/\.(ts|tsx|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("نافذة الشحن 24–72 ساعة", () => {
  it("النص الموحّد يعلن 24–72 ساعة للقاهرة والجيزة و48–72 للباقي", () => {
    expect(SHIPPING_DELIVERY_TEXT).toContain("24–72 ساعة");
    expect(SHIPPING_DELIVERY_TEXT).toContain("48–72 ساعة");
    expect(SHIPPING_DELIVERY_TEXT).not.toContain("24–48");
  });

  it("لا شريحة تجاوز 3 أيام (= 72 ساعة) في البيانات المنظمة", () => {
    for (const window of Object.values(SHIPPING_DELIVERY_WINDOWS)) {
      expect(window.maxDays).toBeLessThanOrEqual(3);
      expect(window.minDays).toBeGreaterThanOrEqual(1);
    }
  });

  it("لا يوجد نص قديم 24–48 أو ٢٤–٤٨ في الكود أو سكربتات البناء", () => {
    const root = resolve(process.cwd());
    const files = [
      ...collectFiles(join(root, "src")),
      ...collectFiles(join(root, "scripts")),
      join(root, "index.html"),
    ];
    const offenders = files.filter((file) => {
      const text = readFileSync(file, "utf-8");
      return text.includes("24–48") || text.includes("24-48") || text.includes("٢٤–٤٨");
    });
    expect(offenders).toEqual([]);
  });
});

describe("الإشراف الطبي — د. خالد شاهين", () => {
  it("الاسم والوصف ثابتان في المصدر الواحد", () => {
    expect(MEDICAL_SUPERVISOR.name).toBe("د. خالد شاهين");
    expect(MEDICAL_SUPERVISOR.line).toContain(MEDICAL_SUPERVISOR.name);
  });

  // صفحات الأقسام ولا الرئيسية ولا الفوتر — يبقى فقط في صفحات الثقة
  // التحريرية (من نحن / تواصل معنا / شفافية المحتوى).
  it("يُستهلك في صفحات الثقة التحريرية فقط", () => {
    // (`about-content` / `review-board-content` / `policy-format`) بدل أن
    // تكون مكتوبة داخل الـ routes؛ الحارس يتابع نفس النية في مكانها الجديد
    // + يتأكد أن الصفحات ما زالت تعرض الاسم فعليًا بعد استبدال الرموز.
    const consumers = [
      "src/data/about-content.ts",
      "src/data/review-board-content.ts",
      "src/lib/policy-format.ts",
    ];
    for (const file of consumers) {
      const source = readFileSync(resolve(process.cwd(), file), "utf-8");
      expect(source, file).toContain("MEDICAL_SUPERVISOR");
    }

    const textOf = (
      sections: { paragraphs?: string[]; bullets?: string[]; cards?: { text: string }[] }[],
    ) =>
      sections
        .flatMap((section) => [
          ...(section.paragraphs ?? []),
          ...(section.bullets ?? []),
          ...(section.cards ?? []).map((card) => card.text),
        ])
        .map(policyText)
        .join(" ");

    expect(textOf(getPolicyPage("contact").sections)).toContain(MEDICAL_SUPERVISOR.name);
    expect(textOf(getPolicyPage("terms").sections)).toContain(MEDICAL_SUPERVISOR.name);
  });

  it("غير مذكور في الفوتر ولا في رأس صفحة المنتج ولا في مكوّنات الرئيسية", () => {
    const root = resolve(process.cwd());
    const forbidden = [
      "src/components/layout/Footer.tsx",
      "src/components/product/ProductHeader.tsx",
      ...collectFiles(join(root, "src/components/sections")),
    ];
    for (const file of forbidden) {
      const source = readFileSync(file.startsWith(root) ? file : resolve(root, file), "utf-8");
      expect(source, file).not.toContain("MEDICAL_SUPERVISOR");
      expect(source, file).not.toContain(MEDICAL_SUPERVISOR.name);
    }
  });

  it("يصدر في البيانات المنظمة كموظف في المنظمة وفي مراجع المقالات", () => {
    const org = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");
    expect(org).toContain(MEDICAL_SUPERVISOR.name);
    expect(org).toContain("الإشراف الطبي");

    const generator = readFileSync(
      resolve(process.cwd(), "scripts/auto-generate-article.mjs"),
      "utf-8",
    );
    expect(generator).toContain(MEDICAL_SUPERVISOR.name);
  });
});
