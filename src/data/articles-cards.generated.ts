/**
 * ⚙️ GENERATED FILE — `npm run build` (scripts/generate-sitemap.mjs).
 * ⚠️ لا يُعدَّل يدوياً — عدّل src/data/articles.ts (أو قائمة الـ slugs في
 *    السكربت) ثم أعِد البناء.
 *
 * بطاقات المقالات المعروضة في الـ homepage (ArticlesGrid): الحقول اللازمة
 * فقط (بلا content/sources) حتى لا يدخل chunk data-articles الكامل في
 * المسار الحرج.
 */
export interface ArticleCard {
  slug: string;
  title: string;
  seoTitle?: string;
  excerpt: string;
  keyTakeaways?: string[];
  image?: string;
  imageAlt?: string;
  category: string;
  readMin: number;
  emoji: string;
}

export const featuredArticleCards: ArticleCard[] = [
  {
    slug: "premature-ejaculation",
    title: "سرعة القذف: فهم علمي وخطة عملية للتحكم",
    excerpt:
      "سرعة القذف مش عيب في رجولتك، وهي الأكثر شيوعًا بين الرجال. اعرف الأسباب، وتمارين التحكم، ومتى تحتاج طبيبًا.",
    image: "/images/article-premature-ejaculation-brand.webp",
    imageAlt:
      "رسم تحريري لساعة رملية ذهبية على خلفية زمردية يعبّر عن التحكم في التوقيت والصبر في علاج سرعة القذف",
    category: "صحة الرجل",
    readMin: 9,
    emoji: "",
  },
  {
    slug: "vacuum-pump-complete-guide",
    title: "مضخة التفريغ (VED): دليل كامل خطوة بخطوة",
    excerpt:
      "مضخة التفريغ خيار غير دوائي معروف. اعرف إزاي تعمل، طريقة الاستخدام، مدة الحلقة، والموانع اللي لازم تعرفها قبل الشراء.",
    image: "/images/article-vacuum-pump-complete-guide-brand.webp",
    imageAlt:
      "رسم هندسي لجهاز مضخة تفريغ بمقياس ضغط وأنبوب على خلفية خضراء يشرح دليل استخدام مضخة التفريغ VED",
    category: "أساسيات",
    readMin: 10,
    emoji: "",
  },
  {
    slug: "womens-libido-boosters",
    title: "الرغبة عند النساء: لماذا تقل، وما يفيد فعلًا",
    excerpt:
      "الرغبة عند النساء مش رقم ثابت ولا مؤشر حب. أسبابها متشابكة، نعرف الفرق بين «الرغبة التلقائية» و«المتجاوبة»، ومتى تُستبعد المشكلة الطبية.",
    image: "/images/article-womens-libido-boosters-brand.webp",
    imageAlt:
      "كوب شاي أعشاب ودفتر مفتوح وأزهار مجففة في ضوء صباح دافئ يرمز إلى الراحة والرغبة عند النساء",
    category: "صحة المرأة",
    readMin: 9,
    emoji: "",
  },
  {
    slug: "device-maintenance-hygiene",
    title: "نظافة وصيانة الأجهزة الشخصية: روتين بسيط",
    excerpt:
      "أغلب مشكلات الأجهزة الشخصية سببها التنظيف والتخزين، مش الجهاز نفسه. روتين دقيقتين بيحمي جهازك وجلدك.",
    image: "/images/article-device-maintenance-hygiene-brand.webp",
    imageAlt:
      "منشفة مطوية وزجاجة محلول تنظيف وفرشاة على رف رخامي توضح روتين تنظيف وصيانة الأجهزة الشخصية",
    category: "وقاية",
    readMin: 7,
    emoji: "",
  },
];

/** عدد المقالات التوعوية إجمالاً (أرقام ديناميكية في الواجهة — بلا hardcode). */
export const ARTICLE_COUNT = 8;
