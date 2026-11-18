import { articleLibrary } from "./articles-content";

export interface ArticleSource {
  title: string;
  url: string;
  publisher: string;
}

export interface ArticleExpert {
  name: string;
  role: string;
  credentials: string;
}

export interface Article {
  image?: string;
  /**
   * يُستخدم في <img alt> وفي image:caption داخل خريطة الصور (شرط جوجل للصور).
   */
  imageAlt?: string;
  slug: string;
  title: string;
  /**
   * عنوان لعرض نتائج البحث فقط — يُستخدم في <title> وog:title حين يتجاوز
   * العنوان الأصلي 62 حرفًا. H1 والـ JSON-LD headline يبقيان على العنوان الكامل.
   */
  seoTitle?: string;
  excerpt: string;
  category: string;
  readMin: number;
  emoji: string;
  content: string;
  keyTakeaways?: string[];
  author: ArticleExpert;
  reviewer: ArticleExpert;
  /** المحتوى المولّد آليًا: الـ JSON-LD لا يعرض reviewedBy (لا مراجعة بشرية). */
  autoReviewed?: boolean;
  publishedAt: string;
  updatedAt: string;
  sources: ArticleSource[];
}

export const articleAuthor: ArticleExpert = {
  name: "فريق المحتوى الصحي — الإخلاص ميديكال",
  role: "إعداد المحتوى تحت المسؤولية التحريرية",
  credentials:
    "محتوى توعوي بالصحة والصحة الزوجية يُنشر تحت المسؤولية التحريرية المباشرة لفريق الإخلاص ميديكال، ويعتمد على مصادر طبية موثوقة (WHO, Mayo Clinic, Cleveland Clinic, NIH) مع تحذيرات استخدام واضحة. المحتوى توعوي، لا يقدم وعودًا علاجية، ولا يغني عن استشارة الطبيب أو الصيدلي.",
};

export const articleReviewer: ArticleExpert = {
  name: "فحص سلامة المحتوى — الإخلاص ميديكال",
  role: "فحص آلي للمصادر والروابط والتحذيرات",
  credentials:
    "كل مقالة تخضع لفحص برمجي آلي (CI) قبل وبعد النشر: حيوية روابط المصادر، وموثوقية النطاقات الطبية، ووجود تحذيرات الاستخدام، ومطابقة البيانات المنظمة. نلتزم بعدم تقديم وعود علاجية، وننصح دائمًا بالاستشارة الطبية المتخصصة عند الحاجة.",
};

/**
 * قائمة المقالات التوعوية.
 *
 * يفضل قابل للقراءة والتحرير بعيدًا عن التعريفات، وهذا الملف يبقى العقد
 * (الأنواع + الهوية التحريرية + المصدر الوحيد `articles` الذي تقرأه
 * السكربتات عبر `/src/data/articles.ts`).
 *
 * إضافة مقالة: عدّل `articles-content.ts` ثم `npm run build` (يعيد توليد
 * الميتا والبطاقات والخريطة تلقائيًا).
 */
export const articles: Article[] = articleLibrary;

/** عنوان الـ <title> لمقالة — يمنع تكرار منطق `seoTitle ?? title` في كل مستهلك. */
export const serpTitleOf = (article: Pick<Article, "title" | "seoTitle">): string =>
  article.seoTitle ?? article.title;
