import { men } from "./products/men";
import { women } from "./products/women";
import { devices } from "./products/devices";
import type { Product, ProductCategory } from "@/data/product-types";
import { expandSearchTerm } from "@/lib/search-terms";
import { getBundlePresentation, getBundleProductType, getOralSolidForm } from "@/lib/product-form";
import { productSearchScore, rankProductSearch } from "@/lib/product-search";
import {
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
  isHomepageProductEligible,
  pickHomepageFeatured,
  pickHomepageTabs,
  sortCategoryProducts,
} from "@/lib/product-selection";

// تعمل الطبقة الخفيفة (بطاقات المنتجات) بنفس القواعد بلا استيراد هذا الملف.
export { HOMEPAGE_CONCERN_CANDIDATES, HOMEPAGE_EXCLUDED_PRODUCT_IDS, isHomepageProductEligible };

export { expandSearchTerm };
export { getBundlePresentation, getBundleProductType, getOralSolidForm } from "@/lib/product-form";

// ✅ إزالة نظام التقييمات التلقائي (Dynamic Review Growth).
// العملاء — وهذا يعدّ "تقييمات وهمية / مراجعات مضللة" مخالفة لسياسة جوجل
// وقد يستدعي عقوبة يدوية أو حرمان الصفحات من النجوم. الآن نستخدم أرقام
// المراجعات الثابتة الأصلية من بيانات المنتجات فقط، دون أي نمو تلقائي.

export const products: Product[] = [...men, ...women, ...devices];

export const getProductsByCategory = (cat: ProductCategory) =>
  sortCategoryProducts(
    products.filter((p) => p.category === cat),
    cat,
  );

export const getFeaturedProducts = (): Product[] => pickHomepageFeatured(getProductById);

/** أقسام الصفحة الرئيسية الثلاثة — مصدر واحد للواجهة والاختبارات. */
export const HOMEPAGE_TAB_CATEGORIES = ["men", "women", "devices"] as const;

/** بطاقات تبويب القسم في الرئيسية — اختيار محرَّر بالجودة والتنوّع. */
export const getHomepageTabCards = (cat: ProductCategory): Product[] =>
  pickHomepageTabs(cat, getProductById, getProductsByCategory(cat));

/** عائلة شكل المنتج التجاري (عسل/كبسولات/كريم/موضعي/جهاز) — لفحص التنوّع. */
export const getProductFamily = (product: Pick<Product, "name">) =>
  getBundleProductType(product as Product);

export const getProductById = (id: string) => products.find((p) => p.id === id);

/**
 * منتجات ظاهرة للعامة في صفحات الفئات.
 * محذوفًا سوى m-43 (Procomil Fort) وw-24 (Black Widow Drops).
 * مفيش أي حظر: كل المنتجات الحالية (91) ظاهرة في الفئات عادي ومن غير
 * noindex ولا استبعاد من feed/sitemap — استثناء واحد فقط: أدوية الوصفة
 */
export const getPublicProductsByCategory = (cat: ProductCategory) => {
  return getProductsByCategory(cat);
};

/**
 * 🔒 قرار المالك: المناديل الرجالية والنسائية لا تظهر داخل أي عرض في صفحات
 * المنتجات. الاستبعاد هنا على مستوى المحرك (لا على مستوى صفحة واحدة) حتى
 * يشمل الأجهزة والرجالي والنسائي، وينعكس تلقائياً على bundles-db.json.
 */
const BUNDLE_EXCLUDED_IDS = new Set(["m-29", "w-23"]);

const isBundleEligibleProduct = (product: Product) =>
  !BUNDLE_EXCLUDED_IDS.has(product.id) && getBundleProductType(product) !== "wipes";

/**
 * 🔒 قرار المالك: عرض الجهاز = الجهاز المطلوب + منتجان رجالي (لا أجهزة).
 * الأجهزة لا تُعرض مع أجهزة أخرى، فالمرافقون يُسحبون من قسم الرجالي.
 */
const bundleCompanionCategory = (product: Product): ProductCategory =>
  product.category === "devices" ? "men" : product.category;

/**
 * أزواج مختارة لكل جهاز: منتج عناية موضعية (جل) + دعم من العسل أو الكبسولات،
 * بأنواع مختلفة، وبلا خلط جل مع كريم ولا أقراص مع كبسولات، وبلا مناديل.
 */
const DEVICE_COMPANIONS: Record<string, readonly string[]> = {
  "d-01": ["m-31", "m-11"],
  "d-02": ["m-01", "m-12"],
  "d-05": ["m-60", "m-01"],
  "d-06": ["m-06", "m-12"],
  "d-07": ["m-31", "m-42"],
  "d-08": ["m-32", "m-16"],
};

/**
 * يختار عضوين غير صلبين فموياً من نفس الفئة بترتيب دوّار ثابت.
 * بهذا تظل كل باقة من 3 منتجات، وتتنوع الاقتراحات من صفحة لأخرى،
 * ولا تتكرر نفس فئة المنتج داخل الباقة.
 */
function pickVariedBundleSuggestions(product: Product, preferredIds: string[] = []): Product[] {
  const companionCategory = bundleCompanionCategory(product);
  const preferred = preferredIds
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p))
    .filter(
      (p) =>
        p.category === companionCategory &&
        p.id !== product.id &&
        isBundleEligibleProduct(p) &&
        !getOralSolidForm(p),
    );
  const preferredIdsSet = new Set(preferred.map((p) => p.id));
  const pool = products.filter(
    (candidate) =>
      candidate.category === companionCategory &&
      candidate.id !== product.id &&
      isBundleEligibleProduct(candidate) &&
      candidate.id !== "w-26" &&
      // Marcin's form correction must not reshuffle the approved bundle pool.
      candidate.id !== "w-21" &&
      candidate.stock > 0 &&
      !getOralSolidForm(candidate) &&
      !preferredIdsSet.has(candidate.id),
  );

  // رقم المنتج يعطي تدويراً ثابتاً: نفس الصفحة = نفس الباقة، لكن الصفحات
  // المختلفة لا تبدأ دائماً من نفس المنتجين.
  const seed = Number(product.id.match(/\d+/)?.[0] ?? 0);
  const start = pool.length > 0 ? seed % pool.length : 0;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const chosen: Product[] = [];
  for (const candidate of [...preferred, ...rotated]) {
    if (chosen.length === 2) break;

    const candidateType = getBundleProductType(candidate);
    const hasSameType = [product, ...chosen].some(
      (existing) => getBundleProductType(existing) === candidateType,
    );
    if (hasSameType) continue;

    const candidateOralForm = getOralSolidForm(candidate);
    const existingOralForms = new Set(
      [product, ...chosen]
        .map((existing) => getOralSolidForm(existing))
        .filter((form): form is "tablet" | "capsule" => Boolean(form)),
    );
    // استمرار منع خلط الأقراص مع الكبسولات، حتى مع اختلاف النوع.
    if (
      candidateOralForm &&
      existingOralForms.size > 0 &&
      !existingOralForms.has(candidateOralForm)
    ) {
      continue;
    }

    const candidatePresentation = getBundlePresentation(candidate);
    const mixesGelAndCream = [product, ...chosen].some((existing) => {
      const existingPresentation = getBundlePresentation(existing);
      return Boolean(
        candidatePresentation &&
        existingPresentation &&
        candidatePresentation !== existingPresentation,
      );
    });
    if (mixesGelAndCream) continue;

    chosen.push(candidate);
  }
  return chosen;
}

/** محرك البيع المتقاطع (Cross Sell Engine) */
export const getCrossSellsForProduct = (product: Product): Product[] => {
  // Preserve the owner-approved existing bundles; new HILTI women is sold separately
  // until complementary bundle alternatives are approved.
  if (product.id === "w-26") return [];

  // 🧻 المناديل (رجالي/نسائي) بلا عرض على صفحتها أصلًا: لا نعرض باقة تحتوي
  // مناديل في أي صفحة منتج، ولا تُدرج لها باقة في bundles-db.json.
  if (!isBundleEligibleProduct(product)) return [];

  // 🖥️ الجهاز: المرافقون منتجات رجالي محددة لكل جهاز. أي معرّف لا يمر بقواعد
  // الباقة (أو خرج من الكتالوج) يُستبدل تلقائياً من نفس محرك الاختيار.
  if (product.category === "devices") {
    const curated = (DEVICE_COMPANIONS[product.id] ?? [])
      .map((id) => getProductById(id))
      .filter(
        (p): p is Product => Boolean(p) && p!.category === "men" && isBundleEligibleProduct(p!),
      );
    if (curated.length === 2) {
      // نفس قواعد فحص البيانات: أنواع مختلفة، بلا خلط جل مع كريم، وبلا خلط
      // أقراص مع كبسولات. نوع الجهاز نفسه داخل الحساب (d-02 اسمه «مع الجل»
      // فيُحسب ضمن عائلة الجل، ولهذا مرافقوه بلا جل ولا كريم).
      const members = [product, ...curated];
      const types = members.map((p) => getBundleProductType(p));
      const presentations = new Set(members.map((p) => getBundlePresentation(p)).filter(Boolean));
      const oralForms = new Set(members.map((p) => getOralSolidForm(p)).filter(Boolean));
      const valid =
        new Set(types).size === types.length && presentations.size <= 1 && oralForms.size <= 1;
      if (valid) return curated;
    }
  }

  // أي cross-sell يدوي يظل له الأولوية، ثم نكمله تلقائياً حتى تصبح الباقة 3 منتجات.
  // الاقتراحات الفموية الصلبة تُستبعد هنا عمداً حتى لا تختلط الأقراص بالكبسولات.
  return pickVariedBundleSuggestions(product, product.crossSell ?? []);
};

/** Look up a product by its URL slug (e.g. "hammer-of-thor-men-capsules"). */
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);

/**
 * هل يطابق المنتج مصطلح البحث؟
 * 1) مطابقة مباشرة في الحقول المعروضة (بما فيها توسيع المرادفات العامة: نقط/قطرات).
 * 2) مطابقة بألقاب المنتج البحثية (searchAliases) — مثال: "سبراي" يطابق
 *    منتج "بخاخ ..." حتى لو الكلمة غير مكتوبة في أي حقل من حقوله.
 */
export const matchesProductQuery = (p: Product, q: string): boolean => productSearchScore(p, q) > 0;

/**
 * بحث شامل في كل المنتجات (رجالي/نساء/أجهزة) — محرك صفحة /search?q={search_term_string}.
 * مطابق لنمط فلترة ?q في صفحات الفئات، ويدعم المرادفات المصرية
 * (مثال: "نقط" ← منتجات "قطرات" والعكس)، بدون شبكة، قابل للاختبار.
 */
export const searchAllPublicProducts = (q: string): Product[] => {
  return rankProductSearch(products, q);
};
