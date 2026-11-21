import type { ProductCardView, ProductCategory } from "@/data/product-types";
import { getBundleProductType } from "@/lib/product-form";

/**
 *
 * (89 منتجًا بوصفها الطويل). الصفحة الرئيسية والسلة تحتاجان الترتيب والاختيار
 * فقط، لا الوصف ولا المكونات — فنُقل المنطق هنا ليعمل على «بطاقة المنتج»
 * (`ProductCardView`) وتستهلكه الطبقة الخفيفة وحدها.
 *
 * الثوابت نفسها لم تتغيّر: أي تعديل هنا ينتشر على الكتالوج الكامل وبطاقاته معًا.
 */

/** منتجات طلبت الإدارة عدم إظهارها في أي قسم من أقسام الصفحة الرئيسية. */
export const HOMEPAGE_EXCLUDED_PRODUCT_IDS = new Set([
  "m-02", // Boost Up MAN
  "m-49", // Power Fully Up Advanced
]);

export const isHomepageProductEligible = (product: Pick<ProductCardView, "id">): boolean =>
  !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id);

/**
 * المرشحون لقسم «تسوق حسب الاحتياج» — مصدر واحد مشترك بين:
 * ShopByConcern (العرض)، ProductsTabs (الاستبعاد لمنع التكرار)،
 * وdata-integrity.test.mjs (التحقق).
 */
export const HOMEPAGE_CONCERN_CANDIDATES = {
  delay: ["m-31", "m-55", "m-30"],
  strength: ["m-04", "m-63", "m-03"],
  devices: ["d-05", "d-07", "d-08", "d-01", "d-02", "d-06"],
  women: ["w-25", "w-10", "w-15"],
} as const;

/**
 * اختيار محرَّر لأقسام «كل احتياج وله قسمه» في الصفحة الرئيسية.
 *
 * (2026-11-19) كان القسم يأخذ **أرخص** المنتجات المتبقية بعد أقسام الاهتمام
 * (تصاعد سعري داخل شرائح 50 جنيهًا)، فتظهر أربع عبوات رخيصة متشابهة الشكل
 * ولا تمثّل القسم. الاختيار الآن **محرَّر بالجودة والتنوّع**: منتجات الإدارة
 * المميزة + درجة فاخرة داخل كل عائلة شكل (عسل/كبسولات/كريم/موضعي/جهاز)،
 * مع استبعاد كل ما ظهر فعليًا في «الأكثر طلبًا» أو في «حدّد احتياجك».
 *
 * ملاحظة الأجهزة: الكتالوج فيه 6 أجهزة فقط، و«حدّد احتياجك» يعرض منها 3،
 * فالمتاح 3 بطاقات. لعرض 4 بطاقات كما في بقية الأقسام اختير الجهاز الأقوى
 * (d-07) ليكون التكرار الوحيد المسموح — أكبر من غيره جودةً وسعرًا.
 */
export const HOMEPAGE_TAB_PICKS = {
  men: ["m-06", "m-19", "m-35", "m-64"],
  women: ["w-02", "w-01", "w-05", "w-04"],
  devices: ["d-07", "d-01", "d-02", "d-06"],
} as const satisfies Record<ProductCategory, readonly string[]>;

/** عدد البطاقات في كل تبويب بالصفحة الرئيسية. */
export const HOMEPAGE_TAB_SIZE = 4;

/** المنتجات الظاهرة فعليًا في «الأكثر طلبًا» و«حدّد احتياجك» (3 لكل احتياج). */
export function homepageDisplayedProductIds(limitPerConcern = 3): Set<string> {
  const ids = new Set<string>(HOME_FEATURED_ORDER.slice(0, 6));
  for (const list of Object.values(HOMEPAGE_CONCERN_CANDIDATES)) {
    list.slice(0, limitPerConcern).forEach((id) => ids.add(id));
  }
  return ids;
}

/**
 * بطاقات التبويب: الاختيار المحرَّر أولًا، ثم استكمال من ترتيب القسم نفسه
 * (بلا تكرار لما ظهر أعلى الصفحة) حتى يكتمل العدد. حتمي بالكامل.
 */
export function pickHomepageTabs<T extends Pick<ProductCardView, "id">>(
  category: ProductCategory,
  byId: (id: string) => T | undefined,
  ordered: T[],
  limit = HOMEPAGE_TAB_SIZE,
): T[] {
  const taken = new Set<string>();
  const chosen: T[] = [];

  for (const id of HOMEPAGE_TAB_PICKS[category]) {
    const product = byId(id);
    if (!product || taken.has(product.id) || !isHomepageProductEligible(product)) continue;
    taken.add(product.id);
    chosen.push(product);
  }

  if (chosen.length < limit) {
    const shownElsewhere = homepageDisplayedProductIds();
    for (const product of ordered) {
      if (chosen.length >= limit) break;
      if (taken.has(product.id) || !isHomepageProductEligible(product)) continue;
      if (shownElsewhere.has(product.id)) continue;
      taken.add(product.id);
      chosen.push(product);
    }
  }

  // لو الكتالوج لا يكفي، نُكمل من المرشحين المتبقين بلا تجاوز الممنوعات.
  if (chosen.length < limit) {
    for (const product of ordered) {
      if (chosen.length >= limit) break;
      if (taken.has(product.id) || !isHomepageProductEligible(product)) continue;
      taken.add(product.id);
      chosen.push(product);
    }
  }

  return chosen.slice(0, limit);
}

/**
 * 🔄 (2026-11-16) قرار المالك: **لا تصاعد سعري في رفّ الأقسام**. كان القسم
 * يفتح بأرخص المنتجات ثم يزحف صعودًا، فيرى الزائر أول شاشة كلها عبوات رخيصة
 * متشابهة ويظن أن هذا كل القسم. الترتيب الجديد **مزيج متبادل** يحافظ على
 * التنوّع في كل شاشة:
 *
 *   1. المتوفر قبل غير المتوفر (الكتالوج كله متوفر — القاعدة للاستثناءات).
 *   2. «افتتاحية» محرَّرة لكل قسم: 4 منتجات معروفة تخلط ثلاث شرائح سعرية
 *      وأربعة أشكال مختلفة (عسل/جل/كبسولات/كريم…) بدل أرخص أربعة.
 *   3. بقية الرفّ بتبادل الشرائح (متوسط ← فاخر ← اقتصادي ← …)، فالسعر يصعد
 *      ويهبط بلا نمط واضح، وداخل الشريحة يتقدّم المميز ثم الأعلى سعرًا.
 *   4. تنويع الشكل: لا ثلاثة منتجات متتالية من نفس العائلة.
 *   5. منتجات طلبت الإدارة تأخيرها تبقى في آخر الرفّ (نساء: w-20، w-23).
 *
 * الترتيب حتمي بالكامل (لا عشوائية) فتبقى الصفحات المبنية مطابقة لما يراه
 * المتصفح، والاختبارات قابلة للتكرار.
 */

/** منتجات طلبت الإدارة بقاءها في آخر رفّ قسم النساء. */
const PINNED_WOMEN_LAST = ["w-20", "w-23"] as const;

type ShelfItem = Pick<
  ProductCardView,
  "id" | "slug" | "name" | "nameEn" | "category" | "price" | "stock"
> & { featured?: boolean; badge?: string };

/** شكل المنتج التجاري — لتنويع الرفّ (عسل، كبسولة، كريم، جهاز…). */
const familyOf = (item: ShelfItem): string => getBundleProductType(item);

/** يمنع تكرار نفس الشكل 3 مرات متتالية دون كسر الترتيب السعري أكثر من لزم. */
function interleaveFamilies<T extends ShelfItem>(ordered: T[], lastIds: Set<string>): T[] {
  const pool = [...ordered];
  const placed: T[] = [];
  const tail: T[] = [];
  let guard = pool.length * pool.length + 16;

  while (pool.length > 0 && guard-- > 0) {
    const next = pool.shift()!;
    if (lastIds.has(next.id)) {
      tail.push(next);
      continue;
    }
    if (placed.length >= 2) {
      const family = familyOf(next);
      const sameFamilyTwice =
        familyOf(placed[placed.length - 1]) === family &&
        familyOf(placed[placed.length - 2]) === family;
      if (sameFamilyTwice) {
        const swapIndex = pool.findIndex((p) => !lastIds.has(p.id) && familyOf(p) !== family);
        if (swapIndex !== -1) {
          const alternative = pool.splice(swapIndex, 1)[0];
          pool.unshift(next);
          placed.push(alternative);
          continue;
        }
      }
    }
    placed.push(next);
  }

  return [...placed, ...pool, ...tail];
}

/** ترتيب منتجات الصفحة الرئيسية — أول 6 فقط تُعرض. */
const HOME_FEATURED_ORDER = [
  "m-11", // Vitamax
  "m-01", // Hammer of Thor
  "m-44", // Dooz 14000
  "m-60", // Kreva
  "w-13", // Golden Gum
  "m-32", // Titan Gold; Connubial now belongs to the women's concern section

  // Reserve products for the featured selection.
  "m-02", // Boost Up MAN remains excluded from the homepage
  "m-52",
  "w-07",
  "w-04",
  "m-29",
  "m-15",
  "m-26",
  "w-08",
  "m-22",
  "m-21",
  "m-25",
  "m-06",
  "m-48",
  "w-01",
  "m-56",
] as const;

/**
 * شرائح السعر الثلاث المستخدمة في التبادل: اقتصادي / متوسط / فاخر.
 * حدودها من نطاق الأسعار الفعلي في الكتالوج (130 إلى 4450 ج.م).
 */
const PREMIUM_FROM = 400;
const MID_FROM = 250;

export type ShelfTier = "budget" | "mid" | "premium";

const tierOf = (price: number): ShelfTier =>
  price >= PREMIUM_FROM ? "premium" : price >= MID_FROM ? "mid" : "budget";

/** ترتيب التبادل: البداية بالمتوسط ثم الفاخر ثم الاقتصادي، ثم يعيد نفسه. */
const TIER_CYCLE: readonly ShelfTier[] = ["mid", "premium", "budget"];

/**
 * «افتتاحية» كل قسم: أربعة منتجات معروفة تخلط الشرائح الثلاث والأشكال،
 * بدل أن يفتح القسم بأرخص أربع عبوات. المعرّفات تُفحص دائمًا قبل الاستخدام
 * (وجودها في القسم، توفرها، وعدم كونها مؤجَّلة لآخر الرفّ)، فأي تعديل في
 * الكتالوج لا يكسر الصفحة.
 */
const SHELF_OPENERS: Record<ProductCategory, readonly string[]> = {
  // كبسولات 500 / جل 280 / كريم 200 / عسل 380 — أربعة أشكال وثلاث شرائح.
  men: ["m-01", "m-60", "m-07", "m-11"],
  // بخاخ 280 / شوكولاتة 230 / عسل 280 / أقراص 280.
  women: ["w-01", "w-04", "w-05", "w-17"],
  // مضخة كهربائية 2950 / يدوية 800 / رقمية 3950 / مجموعة 2350.
  devices: ["d-07", "d-05", "d-01", "d-02"],
};

/** ترتيب داخل الشريحة: المميز أولًا، ثم الأعلى سعرًا، ثم معرّف حتمي. */
const compareWithinTier = <T extends ShelfItem>(a: T, b: T): number => {
  const aFeatured = a.featured ? 1 : 0;
  const bFeatured = b.featured ? 1 : 0;
  if (aFeatured !== bFeatured) return bFeatured - aFeatured;
  if (a.price !== b.price) return b.price - a.price;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/** الترتيب المعتمد لرفّ القسم — مصدر واحد لكل عرض (صفحة القسم، البطاقات، الرئيسية). */
export function sortCategoryProducts<T extends ShelfItem>(items: T[], cat: ProductCategory): T[] {
  const lastIds = new Set<string>(PINNED_WOMEN_LAST);

  // 1) الافتتاحية المحرَّرة (بشرط وجودها في هذا القسم وتوفرها).
  const byId = new Map(items.map((item) => [item.id, item]));
  const openers: T[] = [];
  for (const id of SHELF_OPENERS[cat] ?? []) {
    const item = byId.get(id);
    if (!item || lastIds.has(item.id) || item.stock <= 0) continue;
    if (openers.some((chosen) => chosen.id === item.id)) continue;
    openers.push(item);
  }
  const openedIds = new Set(openers.map((item) => item.id));

  // 2) بقية الرفّ: ثلاث قوائم حسب الشريحة، المتوفر أولًا داخل كل قائمة.
  const rest = items.filter((item) => !openedIds.has(item.id));
  const queues: Record<ShelfTier, T[]> = { budget: [], mid: [], premium: [] };
  for (const item of [...rest].sort((a, b) => {
    const aStock = a.stock > 0 ? 1 : 0;
    const bStock = b.stock > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;
    return compareWithinTier(a, b);
  })) {
    queues[tierOf(item.price)].push(item);
  }

  // 3) تبادل الشرائح بالتناوب حتى تنتهي القوائم.
  const alternated: T[] = [];
  let cursor = 0;
  const remaining = () => queues.budget.length + queues.mid.length + queues.premium.length;
  let guard = items.length * TIER_CYCLE.length + 8;
  while (remaining() > 0 && guard-- > 0) {
    const tier = TIER_CYCLE[cursor++ % TIER_CYCLE.length];
    const next = queues[tier].shift();
    if (next) alternated.push(next);
  }
  // أي عنصر فات (نظريًا) يُلحق بلا حذف.
  for (const tier of TIER_CYCLE) alternated.push(...queues[tier]);

  return [...openers, ...interleaveFamilies(alternated, lastIds)];
}

/** أول 6 منتجات في ترتيب الرئيسية، مع استبعاد الممنوعات. */
export function pickHomepageFeatured<T extends Pick<ProductCardView, "id">>(
  byId: (id: string) => T | undefined,
  limit = 6,
): T[] {
  return HOME_FEATURED_ORDER.map((id) => byId(id))
    .filter((p): p is T => Boolean(p))
    .filter(isHomepageProductEligible)
    .slice(0, limit);
}
