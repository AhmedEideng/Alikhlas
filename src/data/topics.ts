/**
 * ============================================================
 * Topic Authority — نموذج الموضوعات
 * ============================================================
 * يربط صفحات المقالات والأدلة والمنتجات في عناقيد موضوعية (Topic Clusters).
 * فارغ حالياً لبداية نظيفة — يُضاف إليه عند إنشاء المقالات وصفحات الهبوط الجديدة.
 * ============================================================
 */

export interface Topic {
  id: string;
  /** اسم الموضوع بالعربي (بيظهر في الواجهة) */
  name: string;
  /** وصف قصير للكارت */
  description: string;
  emoji: string;
  /** الـ pillar: نوعه + slug */
  pillarKind: "article" | "guide";
  pillarSlug: string;
  /** عنوان الـ pillar (anchor وصفي للروابط) */
  pillarTitle: string;
  /** مقالات الموضوع (شامل الـ pillar لو مقال) */
  articleSlugs: string[];
  /** أدلة الموضوع (شامل الـ pillar لو دليل) */
  guideSlugs: string[];
  /** منتجات الموضوع الرئيسية */
  productIds: string[];
}

/** المسار الكامل للـ pillar */
export function pillarPath(topic: Topic): string {
  return topic.pillarKind === "article"
    ? `/education/${topic.pillarSlug}`
    : `/products/guides/${topic.pillarSlug}`;
}

/**
 * تغطي الكتالوج كله بلا تكرار — أداء الرجل، الأجهزة والعناية بها، والرغبة
 * عند النساء. كل مقالة وكل منتج مذكور هنا موجود بالفعل، والحارس في
 * `topics.test.ts` و`data-integrity` يمنع أي مرجع ميت أو منتج بلا عنقود.
 *
 * الأدلة الشرائية الثلاثة موزّعة على عنقودين: شكل منتج التأخير وقراءة عبوات العسل
 * والشوكولاتة مع أداء الرجل، ودليل اختيار المضخة مع عنقود الأجهزة.
 */
export const TOPICS: Topic[] = [
  {
    id: "mens-performance",
    name: "أداء الرجل: التوقيت والانتصاب والطاقة",
    description:
      "من فهم سرعة القذف إلى اختيار الشكل المناسب — كريم أو بخاخ أو عسل أو قرص — مع طريقة الاستخدام والتحذيرات.",
    emoji: "",
    pillarKind: "article",
    pillarSlug: "premature-ejaculation",
    pillarTitle: "سرعة القذف: فهم علمي وخطة عملية للتحكم",
    articleSlugs: ["premature-ejaculation", "delay-sprays-safe-use"],
    guideSlugs: ["delay-product-forms-guide", "honey-chocolate-label-guide"],
    productIds: [
      "m-01",
      "m-02",
      "m-03",
      "m-04",
      "m-05",
      "m-06",
      "m-07",
      "m-08",
      "m-11",
      "m-12",
      "m-13",
      "m-14",
      "m-15",
      "m-16",
      "m-17",
      "m-18",
      "m-19",
      "m-20",
      "m-21",
      "m-22",
      "m-23",
      "m-24",
      "m-25",
      "m-26",
      "m-27",
      "m-28",
      "m-29",
      "m-30",
      "m-31",
      "m-32",
      "m-34",
      "m-35",
      "m-36",
      "m-37",
      "m-38",
      "m-39",
      "m-40",
      "m-42",
      "m-44",
      "m-45",
      "m-46",
      "m-47",
      "m-48",
      "m-49",
      "m-52",
      "m-54",
      "m-55",
      "m-56",
      "m-59",
      "m-60",
      "m-61",
      "m-62",
      "m-63",
      "m-64",
    ],
  },
  {
    id: "devices-care",
    name: "الأجهزة والعناية بها",
    description: "دليل المضخات وأنواعها، وطريقة التشغيل الآمنة، وتنظيف الجهاز وحفظه بين الجلسات.",
    emoji: "",
    pillarKind: "article",
    pillarSlug: "vacuum-pump-complete-guide",
    pillarTitle: "مضخة التفريغ (VED): دليل كامل خطوة بخطوة",
    articleSlugs: ["vacuum-pump-complete-guide", "device-maintenance-hygiene"],
    guideSlugs: ["vacuum-pump-buying-guide"],
    productIds: ["d-01", "d-02", "d-05", "d-06", "d-07", "d-08"],
  },
  {
    id: "womens-libido",
    name: "الرغبة عند النساء",
    description:
      "ما تقوله المصادر الطبية عن اختلاف الرغبة عند النساء، وأشكال المنتجات النسائية وطريقة استخدامها وتحذيراتها.",
    emoji: "",
    pillarKind: "article",
    pillarSlug: "womens-libido-boosters",
    pillarTitle: "الرغبة عند النساء: لماذا تقل، وما يفيد فعلًا",
    articleSlugs: ["womens-libido-boosters"],
    guideSlugs: [],
    productIds: [
      "w-01",
      "w-02",
      "w-03",
      "w-04",
      "w-05",
      "w-06",
      "w-07",
      "w-08",
      "w-09",
      "w-10",
      "w-11",
      "w-12",
      "w-13",
      "w-14",
      "w-15",
      "w-16",
      "w-17",
      "w-18",
      "w-19",
      "w-20",
      "w-21",
      "w-22",
      "w-23",
      "w-25",
      "w-26",
    ],
  },
];

// ── فهارس سريعة (build-time، ثابتة) ──
const ARTICLE_TOPIC = new Map<string, Topic>();
const GUIDE_TOPIC = new Map<string, Topic>();
const PRODUCT_TOPIC = new Map<string, Topic>();
for (const t of TOPICS) {
  for (const s of t.articleSlugs) ARTICLE_TOPIC.set(s, t);
  for (const s of t.guideSlugs) GUIDE_TOPIC.set(s, t);
  for (const id of t.productIds) PRODUCT_TOPIC.set(id, t);
}

/** الموضوع الأساسي للمقال */
export const topicForArticle = (slug: string): Topic | undefined => ARTICLE_TOPIC.get(slug);
/** الموضوع الأساسي للدليل */
export const topicForGuide = (slug: string): Topic | undefined => GUIDE_TOPIC.get(slug);
/** الموضوع الأساسي للمنتج */
export const topicForProduct = (id: string): Topic | undefined => PRODUCT_TOPIC.get(id);

/** هل المسار ده هو الـ pillar لموضوع؟ */
export const isPillarPath = (path: string): boolean => TOPICS.some((t) => pillarPath(t) === path);

/** مواضيع مرتبطة للصفحة الحالية */
export function topicsForPage(ownTopic: Topic | undefined, limit = 4): Topic[] {
  const out: Topic[] = [];
  if (ownTopic) out.push(ownTopic);
  for (const t of TOPICS) {
    if (out.length >= limit) break;
    if (t !== ownTopic) out.push(t);
  }
  return out;
}
