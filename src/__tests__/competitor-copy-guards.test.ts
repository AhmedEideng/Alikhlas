import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 *
 * كل جملة في القائمة وُجدت حرفيًا في متجر منافس وقيست بنسبة تطابق 5-grams
 * على 85 صفحة منتج + الصفحة الرئيسية + 3 صفحات أقسام + 5 مقالات. أُعيدت
 * قادم. القائمة ليست «كلمات ممنوعة» بل جُمل كاملة — تجنّب حذفها أو تخفيفها.
 */
const BANNED_SENTENCES = [
  "شركة متخصصة في منتجات الصحة والسعادة الزوجية",
  "نوفر تشكيلة مختارة",
  "نحافظ على خصوصية الطلبات",
  "منتجات أصلية مختارة بعناية",
  "يتم تغليف الطلب في عبوة محايدة",
  "خصوصية كاملة لبيانات الطلب",
  "باقة التوفير والأداء المتكامل",
  "منتجات متكاملة تغطي احتياجك",
  "لماذا تطلب من الإخلاص؟",
  "شحن سري بدون اسم المنتج على العبوة",
  "يمكنك إرسال تجربتك بعد الاستخدام",
  "هذا المحتوى توعوي",
  "نستخدم مصادر طبية وتعليمية موثوقة",
  "تصفح كل منتجات",
] as const;

const ROOT = resolve(__dirname, "../..");
const SCAN_DIRS = ["src", "scripts"];
const EXTRA_FILES = ["index.html"];

function collect(dir: string): string[] {
  const abs = resolve(ROOT, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const path = resolve(abs, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      out.push(...collect(`${dir}/${entry}`));
    } else if (/\.(ts|tsx|mjs|js|html)$/.test(entry)) {
      out.push(`${dir}/${entry}`);
    }
  }
  return out;
}

// الملف نفسه خارج الفحص لأنه يحتوي الجمل الممنوعة كنص مرجعي.
const SELF = "src/__tests__/competitor-copy-guards.test.ts";
const SURFACES = [...SCAN_DIRS.flatMap(collect), ...EXTRA_FILES].filter((f) => f !== SELF);

describe("نسخ المنافس لا تعود", () => {
  it("لا توجد أي جملة من القائمة في أسطح النسخ", () => {
    const hits: string[] = [];
    for (const relative of SURFACES) {
      const source = readFileSync(resolve(ROOT, relative), "utf-8");
      for (const sentence of BANNED_SENTENCES) {
        if (source.includes(sentence)) hits.push(`${relative} :: ${sentence}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("حارس الاختبار نفسه يعمل (الجملة موجودة في ملف وهمي)", () => {
    const probe = "تصفح كل منتجات الصحة الزوجية للنساء";
    expect(BANNED_SENTENCES.some((sentence) => probe.includes(sentence))).toBe(true);
  });
});
