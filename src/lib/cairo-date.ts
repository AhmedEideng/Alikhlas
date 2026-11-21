/**
 * 📅 تاريخ المحتوى — واجهة الواجهة الأمامية للـhelper الوحيد في
 * `scripts/cairo-date.mjs` (مصدر واحد يُستخدم في وقت البناء وأيضًا هنا).
 *
 * كل مقال/دليل يُنشأ يأخذ تاريخ يوم إنشائه في توقيت القاهرة، لا UTC ولا
 * تاريخًا مكتوبًا بيد. التفاصيل في الملف الأصلي.
 */
export {
  CAIRO_TIME_ZONE,
  isIsoDate,
  resolveContentDate,
  todayInCairo,
} from "../../scripts/cairo-date.mjs";
