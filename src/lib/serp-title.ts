/**
 * ضبط عنوان نتائج البحث (SERP) على السقف العملي — بلا اقتطاع.
 *
 * القاعدة:
 *   1. العنوان داخل الحد → يُعاد كما هو (العلامة التجارية تبقى).
 *   2. العنوان يزيد ولاحقته علامة تجارية → تُحذف اللاحقة وحدها.
 *   3. العنوان يزيد بلا لاحقة → يُعاد كما هو ولا يُقتطع.
 */

/** السقف العملي لعرض العنوان كاملًا في نتائج سطح المكتب (‎≈580px). */
export const SERP_TITLE_MAX = 62;

/** أقل طول مقبول بعد حذف العلامة التجارية — أقل من ذلك يفقد العنوان معناه. */
const MIN_TITLE_AFTER_STRIP = 30;

/**
 * لاحقة العلامة التجارية كما تُكتب فعليًا في بيانات الموقع:
 * « | الإخلاص ميديكال» و« | الإخلاص» و« — الإخلاص ميديكال» و« | الإخلاص للسعادة الزوجية».
 */
const BRAND_SUFFIX = /\s*[|—–-]\s*الإخلاص(\s+(ميديكال|للسعادة الزوجية))?\s*$/u;

/**
 * يعيد العنوان بصيغة معروضة كاملة في SERP.
 *
 * @example
 * fitSerpTitle("كيف يؤثر التواصل بين الزوجين على الرغبة الجنسية | الإخلاص ميديكال")
 * // → "كيف يؤثر التواصل بين الزوجين على الرغبة الجنسية"
 */
export function fitSerpTitle(title: string, max: number = SERP_TITLE_MAX): string {
  const value = (title || "").trim();
  if ([...value].length <= max) return value;

  const withoutBrand = value.replace(BRAND_SUFFIX, "").trim();
  if (withoutBrand === value) return value;
  if ([...withoutBrand].length < MIN_TITLE_AFTER_STRIP) return value;
  if ([...withoutBrand].length > max) return value;

  return withoutBrand;
}
