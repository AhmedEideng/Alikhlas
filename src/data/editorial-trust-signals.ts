/**
 * Shared, factual editorial disclosures; not a medical-review certificate.
 *
 * قواعد الهوية («لا إيموجي في الواجهة»). الآن كل بند أيقونة lucide مستقلة
 * + نص نظيف، والصفحة هي التي ترسم الأيقونة.
 */
export type EditorialSignalIcon = "pen" | "book" | "warning" | "search" | "stethoscope";

export const editorialTrustSignals: { icon: EditorialSignalIcon; text: string }[] = [
  {
    icon: "pen",
    text: "المحتوى منشور تحت المسؤولية التحريرية لفريق المحتوى الصحي في الإخلاص ميديكال.",
  },
  {
    icon: "book",
    text: "في نهاية كل مقال قائمة المصادر بروابطها؛ وما يثبته البحث عن فكرة عامة لا يعني تلقائيًا إثبات فعالية منتج تجاري بعينه.",
  },
  {
    icon: "warning",
    text: "ما نكتبه للفهم العام: لا تشخيص لحالتك، ولا وصفة، ولا بديل عن رأي طبيب يعرف تاريخك الصحي.",
  },
  {
    icon: "search",
    text: "فحص الروابط والبيانات يتم ببرنامج، وهو لا يغني عن نظر بشري طبي في المضمون.",
  },
  {
    icon: "stethoscope",
    text: "استشر الطبيب مع الحمل أو الرضاعة أو الأمراض المزمنة أو تناول أدوية منتظمة.",
  },
];
