/**
 * ============================================================
 * Share messages — حلقة الانتشار عبر واتساب
 * ============================================================
 * قواعد الصياغة:
 *   • رسالة طبيعية غير إعلانية.
 *   • اللينك دائماً آخر سطر (قابل للنقر في كل المنصات).
 *   • السعر في مشاركة المنتجات فقط.
 * ============================================================
 */

const SITE_URL = "https://alikhlasmedical.store";

/** يبني لينك wa.me الرسمي لمشاركة نص (بلا رقم = شاشة اختيار جهة الإرسال). */
export function waShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** لينك الصفحة المطلق (مستقر — بلا query params في الروابط المشاركة). */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

/** منتج: الاسم + السعر + اللينك */
export function shareProductText(name: string, price: number, path: string): string {
  return `شوف «${name}» عند الإخلاص ميديكال | ${price} ج.م (شحن سري ودفع عند الاستلام)\n${absoluteUrl(path)}`;
}

/** مقال: توعوي — العنوان + اللينك */
export function shareArticleText(title: string, path: string): string {
  return `مقال يستاهل قراءتك: «${title}»، الإخلاص ميديكال\n${absoluteUrl(path)}`;
}

/** دليل: عنوان + اللينك */
export function shareGuideText(title: string, path: string): string {
  return `دليل مفيد: «${title}»، الإخلاص ميديكال\n${absoluteUrl(path)}`;
}
