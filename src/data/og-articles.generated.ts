/**
 * صور مشاركة بنسبة 2:1 ‏(1200×630) لمقالات التوعية.
 * عند إضافة مقال جديد بصورة مخصصة في public/images/og-articles/<slug>.webp،
 * أضف الـ slug هنا؛ وإلا يعود النظام تلقائياً لصورة المقال الأصلية أو og-default.jpg.
 */
export const ogArticleSlugs: string[] = [
  "premature-ejaculation",
  "delay-sprays-safe-use",
  "vacuum-pump-complete-guide",
  "device-maintenance-hygiene",
  "womens-libido-boosters",
  "cialis-vs-viagra-vs-levitra",
  "erectile-dysfunction-causes",
  "vaginal-dryness-causes",
];

/** مسار صورة المشاركة 2:1 للمقال إن وُجدت، وإلا null (يرجع الجميع لصورة المقال). */
export function ogArticleImage(slug: string): string | null {
  return ogArticleSlugs.includes(slug) ? `/images/og-articles/${slug}.webp` : null;
}
