/**
 * ============================================================
 * 🔧 مصدر الحقيقة الوحيد (SSOT) لإعدادات الموقع المشتركة
 * ============================================================
 * المشتركة (شحن المحافظات / حد الشحن المجاني / شرائح الخصم):
 *
 *   الفرونت  ← يستورد من هنا مباشرة (build-time)
 *   الـ build ← يولّد من هنا api/lib/config-db.json للسيرفر
 *               (artifact يُبندل مع النشر ويقرأه السيرفر وقت
 *               التشغيل — نفس نمط products.ts → products-db.json)
 *
 * ⚠️ لذلك **لا يُعدَّل أي رقم في config-db.json يدويًا** — أي
 * تعديل يدوي فيه بيتسحب عند أول build (المصدر هنا TS).
 *
 * العروض بينما BUNDLE_DISCOUNT_RATE ومصدّره TS — مصدران لاتجاه واحد = drift محتمل. دلوقتي كل
 * الإعدادات المشتركة لها مصدر واحد (TS) والـ JSON artifact.
 * ============================================================
 */

export interface GovernorateShipping {
  name: string;
  shipping: number;
  region: string;
}

export type ShippingDeliveryWindowKey = "metropolitan" | "other";

export interface ShippingDeliveryWindow {
  key: ShippingDeliveryWindowKey;
  label: string;
  text: string;
  minDays: number;
  maxDays: number;
}

/**
 * المواعيد المعلنة للشحن — المصدر الوحيد للنص الظاهر ولـ Product/Offer schema.
 *
 * القاهرة والجيزة 24–72 ساعة عمل، وباقي المحافظات 48–72 ساعة عمل.
 * لا يوجد أي وعد يتجاوز 72 ساعة في الموقع الآن.
 * تمثيل الساعات في Schema يكون بالأيام لأن Schema.org لا يملك وحدة ساعات
 * لحقول deliveryTime: 1–3 أيام للقاهرة والجيزة، و2–3 أيام للباقي.
 */
export const SHIPPING_DELIVERY_WINDOWS: Record<ShippingDeliveryWindowKey, ShippingDeliveryWindow> =
  {
    metropolitan: {
      key: "metropolitan",
      label: "القاهرة والجيزة",
      text: "24–72 ساعة عمل",
      minDays: 1,
      maxDays: 3,
    },
    other: {
      key: "other",
      label: "باقي المحافظات",
      text: "48–72 ساعة عمل",
      minDays: 2,
      maxDays: 3,
    },
  };

export const SHIPPING_DELIVERY_TEXT =
  `القاهرة والجيزة: ${SHIPPING_DELIVERY_WINDOWS.metropolitan.text}. ` +
  `باقي المحافظات: ${SHIPPING_DELIVERY_WINDOWS.other.text}`;

export function getShippingDeliveryWindow(governorate: string): ShippingDeliveryWindow {
  const normalized = governorate.trim().replace(/\s+/g, " ");
  return normalized === "القاهرة" || normalized === "الجيزة"
    ? SHIPPING_DELIVERY_WINDOWS.metropolitan
    : SHIPPING_DELIVERY_WINDOWS.other;
}

export interface PromoTier {
  threshold: number;
  discount: number;
  label: string;
  icon: string;
  name: string;
  color: string;
}

/** جميع المحافظات مع تكلفة الشحن (المصدر الوحيد). */
export const GOVERNORATE_SHIPPING: GovernorateShipping[] = [
  { name: "القاهرة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "الإسكندرية", shipping: 70, region: "وجه بحري" },
  { name: "الجيزة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "القليوبية", shipping: 70, region: "وجه بحري" },
  { name: "البحيرة", shipping: 70, region: "وجه بحري" },
  { name: "مطروح", shipping: 120, region: "وجه بحري" },
  { name: "دمياط", shipping: 70, region: "وجه بحري" },
  { name: "الدقهلية", shipping: 70, region: "وجه بحري" },
  { name: "الشرقية", shipping: 70, region: "وجه بحري" },
  { name: "الغربية", shipping: 70, region: "وجه بحري" },
  { name: "المنوفية", shipping: 70, region: "وجه بحري" },
  { name: "كفر الشيخ", shipping: 70, region: "وجه بحري" },
  { name: "الإسماعيلية", shipping: 70, region: "وجه بحري" },
  { name: "السويس", shipping: 70, region: "وجه بحري" },
  { name: "بورسعيد", shipping: 70, region: "وجه بحري" },
  { name: "شمال سيناء", shipping: 120, region: "سيناء" },
  { name: "جنوب سيناء", shipping: 120, region: "سيناء" },
  { name: "البحر الأحمر", shipping: 120, region: "وجه قبلي" },
  { name: "الفيوم", shipping: 90, region: "وجه قبلي" },
  { name: "بني سويف", shipping: 90, region: "وجه قبلي" },
  { name: "المنيا", shipping: 90, region: "وجه قبلي" },
  { name: "أسيوط", shipping: 90, region: "وجه قبلي" },
  { name: "سوهاج", shipping: 90, region: "وجه قبلي" },
  { name: "قنا", shipping: 90, region: "وجه قبلي" },
  { name: "الأقصر", shipping: 90, region: "وجه قبلي" },
  { name: "أسوان", shipping: 90, region: "وجه قبلي" },
  { name: "الوادي الجديد", shipping: 90, region: "وجه قبلي" },
];

/**
 * 🎁 نسبة خصم الباقة (المصدر الوحيد) — 20%.
 * للإعدادات المشتركة بين الواجهة والسيرفر (والـ build يولّد منه
 * ثلاث واجهات (رسالة واتساب، السلة، بانر الباقة) — أي تعديل للنسبة كان
 * يترك نصوصًا تكذب على العميل.
 */
export const BUNDLE_DISCOUNT_RATE = 0.2;

/** نفس النسبة كنسبة مئوية صحيحة للعرض في النصوص («20%»). */
export const BUNDLE_DISCOUNT_PERCENT = Math.round(BUNDLE_DISCOUNT_RATE * 100);

/**
 * حتى لا يتكرّر الاسم بصيغ مختلفة في الفوتر وصفحات الثقة وبيانات المنظمة.
 * الاسم فقط بلا ألقاب أو أرقام تراخيص غير موثّقة.
 */
export const MEDICAL_SUPERVISOR = {
  name: "د. خالد شاهين",
  role: "الإشراف الطبي",
  line: "الإشراف الطبي: د. خالد شاهين",
} as const;

/** الحد الأدنى للشحن المجاني (المصدر الوحيد). */
export const FREE_SHIPPING_THRESHOLD: number = 2000;

/**
 * («14 يومًا» و«7 أيام عمل»). الآن رقم واحد هنا، والتوكيد في كل صفحة عبر
 * `{{RETURN_DAYS}}` و`{{REFUND_DAYS}}` حتى لا تتباعد نسختان.
 */
export const RETURN_WINDOW_DAYS = 14;
export const REFUND_PROCESSING_DAYS = 7;

/**
 * شرائح الخصم المتدرج (المصدر الوحيد) — مرتبة من الأعلى للأدنى.
 *
 * صاعدة (١٠٪ ← ١٥٪ ← ٢٠٪) بنفس الحدود المالية تمامًا (١٠٠٠ / ١٥٠٠ / ٢٠٠٠).
 * التغيير في التسمية والوصف فقط — الأرقام والمنطق الحسابي كما هي.
 */
export const PROMO_TIERS: PromoTier[] = [
  {
    threshold: 2000,
    discount: 0.2,
    label: "20%",
    icon: "🥇",
    name: "الدرجة الثالثة — توفير ٢٠٪",
    color: "from-[#c8961e] to-[#8a6a12]",
  },
  {
    threshold: 1500,
    discount: 0.15,
    label: "15%",
    icon: "🥈",
    name: "الدرجة الثانية — توفير ١٥٪",
    color: "from-[#0d7a43] to-[#064e2b]",
  },
  {
    threshold: 1000,
    discount: 0.1,
    label: "10%",
    icon: "🥉",
    name: "الدرجة الأولى — توفير ١٠٪",
    color: "from-[#0b6b3a] to-[#095930]",
  },
];

/** أدنى حد للخصم (أصغر شريحة). */
export const PROMO_MIN_THRESHOLD: number =
  PROMO_TIERS.length > 0 ? PROMO_TIERS[PROMO_TIERS.length - 1].threshold : 0;

/** دالة مساعدة: التقييم الرقمي الحتمي لأي محافظة. */
export function getShippingCost(governorate: string, subtotal = 0): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const normalized = governorate.trim().replace(/\s+/g, " ");
  const found = GOVERNORATE_SHIPPING.find((g) => g.name === normalized);
  return found ? found.shipping : 70;
}

/**
 * المواد الفعالة الدوائية التي تمنعها سياسات Google Merchant Center في القوائم
 * صفحات المنتجات تبقى منشورة ومفهرسة، ولا تُحذف من الكتالوج أو الـ sitemap.
 * هذا هو المصدر الوحيد للقاعدة؛ تستهلكها generate-sitemap والاختبارات والتدقيق.
 */
export const PRESCRIPTION_ACTIVE_PATTERN =
  /sildenafil|tadalafil|vardenafil|dapoxetine|سيلدينافيل|تادالافيل|دابوكستين|finasteride|فيناسترايد/i;

export interface MerchantFeedScreenable {
  name?: string;
  nameEn?: string;
  description?: string;
  ingredients?: string;
}

/** هل يُستبعد المنتج من فيد Merchant لاحتوائه مادة دوائية بوصفة؟ */
export function isMerchantFeedExcluded(product: MerchantFeedScreenable): boolean {
  const hay = `${product.name || ""} ${product.nameEn || ""} ${product.description || ""} ${
    product.ingredients || ""
  }`;
  return PRESCRIPTION_ACTIVE_PATTERN.test(hay);
}

/**
 * ============================================================
 * ✆📊 بيانات التواصل والتحليلات — المصدر الوحيد (SSOT)
 * ============================================================
 * (`src/lib/whatsapp.ts` + ثلاثة مواضع داخل `index.html`) ورقم GA
 * الملفات كلها، وأي نسيان لواحد منها يجعل زر «اطلب عبر واتساب» في
 * 110 صفحة يشير إلى رقم مختلف عن الميتا وJSON-LD.
 *
 * القاعدة الآن:
 *   • الرقم ومعرّف GA يُضبطان من متغيّرات البيئة وقت البناء
 *     (`VITE_WHATSAPP_NUMBER` و`VITE_GA_ID` — موثّقة في .env.example).
 *   • `index.html` لا يحمل أرقامًا، بل رموزًا (`__WHATSAPP_NUMBER__`،
 *     `__WHATSAPP_DISPLAY__`، `__GA_MEASUREMENT_ID__`) يستبدلها
 *     `scripts/prerender-seo.mjs` من هذا الملف لكل صفحة.
 *   • الواجهة (React) تستورد نفس الثوابت مباشرة.
 *
 * ⚠️ القيمة الافتراضية أدناه رقم بديل للاختبار فقط، وليست رقمًا حقيقيًا.
 * ضبط `VITE_WHATSAPP_NUMBER` في بيئة النشر هو ما يفعّل الرقم الفعلي.
 */
const BUILD_ENV: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/** الرقم البديل (اختبار/تطوير فقط) — يُكتب هنا مرة واحدة ولا يتكرر في أي ملف. */
const PLACEHOLDER_WHATSAPP = "201000000000";

export const WHATSAPP_NUMBER: string =
  (BUILD_ENV.VITE_WHATSAPP_NUMBER ?? "").replace(/[^\d]/g, "") || PLACEHOLDER_WHATSAPP;

/** هل ما زلنا على الرقم البديل؟ الواجهة تستخدمه لإظهار تنبيه في بيئة التطوير. */
export const WHATSAPP_IS_PLACEHOLDER = WHATSAPP_NUMBER === PLACEHOLDER_WHATSAPP;

/** الصيغة المعروضة: ‎+20 100 000 0000 — تُشتق من الرقم نفسه، لا تُكتب يدويًا. */
export const WHATSAPP_DISPLAY = `+${WHATSAPP_NUMBER.replace(
  /^(\d{2})(\d{3})(\d{3})(\d{4})$/,
  "$1 $2 $3 $4",
)}`;

/** معرّف GA4 (G-XXXXXXX). فارغ = التحليلات معطّلة عمدًا وبلا أخطاء. */
export const GA_MEASUREMENT_ID: string = (BUILD_ENV.VITE_GA_ID ?? "").trim();
