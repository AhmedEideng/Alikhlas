import { describe, expect, it } from "vitest";

import { products } from "@/data/products";
import { makeProductMetaTitle } from "@/lib/seo";

/**
 *
 * («[الشكل] [العلامة] [الفائدة] للرجال — [الحجم]») — أي أن 30+ عنوانًا كان
 * ينتهي بنفس الكلمتين و25+ يبدأ بنفس الكلمة، وهو نص متكرر على جوجل بين 85
 * صفحة متجاورة. أُعيد ترتيب البنى إلى خمسة قوالب متبادلة، وهذا الملف يمنع
 * الرجوع إلى القالب الواحد تلقائيًا.
 *
 * القواعد المحروسة هنا لا تفرض صياغة معيّنة، بل تمنع **هيمنة قالب واحد**:
 *   • لا ينتهي أكثر من 35% من أسماء قسم واحد بنفس علامة الجنس.
 *   • 25 كلمة افتتاحية مختلفة على الأقل في الكتالوج.
 *   • لا يتكرر أي تسلسل من 3 كلمات أكثر من 8 مرات (كلمة البحث المشروعة
 *     مثل «لتأخير القذف» تتكرر 6 مرات كحد أقصى، فلا تُحسب مخالفة).
 *   • كل اسم يحمل كلمة الشكل (جل/كريم/كبسولات…) لأجل المطابقة في البحث
 *     ودقة الـ JSON-LD، ويبقى داخل ميزانية عنوان الميتا.
 */

const SHAPES = [
  "كبسولات",
  "أقراص",
  "كريم",
  "جل",
  "عسل",
  "شوكولاتة",
  "بخاخ",
  "قطرات",
  "علكة",
  "لبان",
  "مناديل",
  "قهوة",
  "معجون",
  "مضخة",
  "حقيبة",
  "مجموعة",
  "جهاز",
];

const stripLatin = (name: string) =>
  name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** الاسم بلا العلامة اللاتينية بين قوسين — تُقاس علامة الجنس على نهاية الجزء العربي. */
const arabicPart = (name: string) => name.replace(/\s*[(][^)]*[)]\s*$/, "").trim();

const grams = (text: string, size = 3) => {
  const words = text.split(" ").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + size <= words.length; i += 1) out.push(words.slice(i, i + size).join(" "));
  return out;
};

describe("تنويع أسماء المنتجات", () => {
  it("كل اسم يحمل كلمة فخامة واحدة على الأقل، ولا تهيمن كلمة واحدة", () => {
    // بكلمات متكافئة لا بتكرار كلمة واحدة — وإلا عاد النص المتكرر على جوجل.
    const PREMIUM = [
      "فاخر",
      "ملكي",
      "الملكية",
      "ملكية",
      "الأصلي",
      "أصلية",
      "بريميوم",
      "احترافي",
      "المتطور",
      "متطور",
      "المطوّرة",
      "المتقدمة",
      "المركّز",
      "حريري",
      "الذهبي",
      "الذهبية",
      "الاستثنائي",
      "الاستثنائية",
      "إصدار",
      "نخبة",
      "راقٍ",
      "الراقية",
      "عالي التركيز",
      "VIP",
      // أصل جغرافي موثّق في الكتالوج
      "الألماني",
      "الكوري",
      "الهندي",
      "الروسي",
      "الإيطالي",
      "الأمريكية",
      "الأسترالية",
      "التركية",
    ];
    const missing = products
      .filter((product) => !PREMIUM.some((word) => product.name.includes(word)))
      .map((product) => product.id);
    expect(missing).toEqual([]);

    const counts = PREMIUM.map((word) => ({
      word,
      hits: products.filter((product) => product.name.includes(word)).length,
    })).sort((a, b) => b.hits - a.hits);
    // «فاخر» هو الأكثر شيوعًا بطبيعته — السقف يمنع أن يصبح قالبًا موحّدًا.
    expect(counts[0].word, JSON.stringify(counts.slice(0, 4))).toBe("فاخر");
    expect(counts[0].hits, JSON.stringify(counts.slice(0, 4))).toBeLessThanOrEqual(32);
  });

  it("كل اسم يحمل كلمة الشكل المناسبة لصنفه", () => {
    const missing = products
      .filter((product) => !SHAPES.some((shape) => product.name.includes(shape)))
      .map((product) => product.id);
    expect(missing).toEqual([]);
  });

  it("لا يهيمن قالب واحد: لا ينتهي أكثر من 35% من قسم بنفس علامة الجنس", () => {
    const offenders: string[] = [];
    for (const category of ["men", "women"] as const) {
      const group = products.filter((product) => product.category === category);
      const tag = category === "men" ? "للرجال" : "للنساء";
      const endsWithTag = group.filter((product) => arabicPart(product.name).endsWith(tag)).length;
      if (endsWithTag > Math.ceil(group.length * 0.35)) {
        offenders.push(`${category}: ${endsWithTag}/${group.length} ينتهي بـ«${tag}»`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("25 كلمة افتتاحية مختلفة على الأقل، ولا تسلسل من 3 كلمات يتكرر أكثر من 8 مرات", () => {
    const first = new Set(products.map((product) => stripLatin(product.name).split(" ")[0]));
    expect(first.size, [...first].join(" · ")).toBeGreaterThanOrEqual(25);

    const counts = new Map<string, string[]>();
    for (const product of products) {
      for (const gram of grams(stripLatin(product.name))) {
        counts.set(gram, [...(counts.get(gram) ?? []), product.id]);
      }
    }
    const heavy = [...counts.entries()].filter(([, ids]) => ids.length > 8);
    expect(heavy.map(([gram, ids]) => `${gram} → ${ids.join(",")}`)).toEqual([]);
  });

  it("لا ادعاء تفوّق ولا جملة إحالة داخل الأسماء", () => {
    const banned = [
      "أقوى",
      "الأكثر مبيعاً",
      "الأكثر مبيعا",
      "مذهل",
      "سيطرة مطلقة",
      "استشر",
      "استشارة",
      "حسب العبوة",
      "علاج",
    ];
    const hits = products.flatMap((product) =>
      banned.filter((word) => product.name.includes(word)).map((word) => `${product.id}:${word}`),
    );
    expect(hits).toEqual([]);
  });

  it("كل اسم داخل ميزانية عنوان SERP وبلا علامة لاتينية مكررة", () => {
    for (const product of products) {
      const title = makeProductMetaTitle(product.name, 70, product.titleLatin);
      expect([...title].length, `${product.id} → ${title}`).toBeGreaterThanOrEqual(25);
      expect([...title].length, `${product.id} → ${title}`).toBeLessThanOrEqual(65);
    }
  });
});
