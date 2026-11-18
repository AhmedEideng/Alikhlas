/**
 * 📅 تاريخ المحتوى الموحّد — مصدر واحد لتاريخ «يوم الإنشاء».
 *
 * القاعدة التي يفرضها هذا الملف:
 *   • كل مقال (أو دليل) يُنشأ اليوم يأخذ تاريخ **اليوم في توقيت القاهرة**،
 *     لا تاريخ UTC ولا تاريخًا مكتوبًا بيد.
 *   • سبب وجوده: `new Date().toISOString().slice(0, 10)` يعطي تاريخ UTC،
 *     والقاهرة تسبقه بساعتين (وساعة إضافية في التوقيت الصيفي). مقال يُنشأ
 *     الساعة 1 بعد منتصف الليل بتوقيت مصر كان يُسجَّل بتاريخ اليوم السابق.
 *   • التوقيت ثابت على `Africa/Cairo` بالنظام (Intl) لا بإزاحة مكتوبة،
 *     فيتبع التوقيت الصيفي المصري تلقائيًا.
 *   • يمكن تثبيت التاريخ يدويًا عبر `ARTICLE_DATE=YYYY-MM-DD` لأي جهاز
 *     ساعته غير مضبوطة، لكن القيمة تُرفض لو لم تكن بصيغة YYYY-MM-DD.
 *
 * يُستورد من: `scripts/auto-generate-article.mjs` (وقت إنشاء المقال)،
 * و`scripts/generate-sitemap.mjs` (سقف الـlastmod)، و`src/lib/cairo-date.ts`
 * (الاختبارات والواجهة).
 */

export const CAIRO_TIME_ZONE = "Africa/Cairo";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const cairoFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAIRO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * تاريخ اليوم في توقيت القاهرة بصيغة YYYY-MM-DD.
 * @param {Date} [now] لحظة القياس (تُمرَّر في الاختبارات للثبات).
 * @returns {string}
 */
export function todayInCairo(now = new Date()) {
  /** @type {Record<string, string>} */
  const parts = {};
  for (const part of cairoFormatter.formatToParts(now)) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      parts[part.type] = part.value;
    }
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * هل القيمة تاريخ صالح بصيغة YYYY-MM-DD؟
 * @param {unknown} value
 * @returns {boolean}
 */
export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // يرفض تواريخ مثل 2026-02-31 التي تُصحَّح تلقائيًا إلى مارس.
  return parsed.toISOString().slice(0, 10) === value;
}

/**
 * تاريخ إنشاء محتوى جديد: اليوم في القاهرة، أو قيمة `override` صالحة إن مُرِّرت.
 * @param {{ now?: Date, override?: string | null }} [options]
 * @returns {string}
 */
export function resolveContentDate({ now = new Date(), override = null } = {}) {
  const value = typeof override === "string" ? override.trim() : "";
  if (value === "") return todayInCairo(now);
  if (!isIsoDate(value)) {
    throw new Error(`تاريخ الإنشاء غير صالح: "${value}" — الصيغة المطلوبة YYYY-MM-DD.`);
  }
  return value;
}
