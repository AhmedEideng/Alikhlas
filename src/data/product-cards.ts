import { productCards } from "./product-cards.generated";
import type { ProductCardView, ProductCategory } from "./product-types";
import {
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
  HOMEPAGE_TAB_PICKS,
  HOMEPAGE_TAB_SIZE,
  homepageDisplayedProductIds,
  isHomepageProductEligible,
  pickHomepageFeatured,
  pickHomepageTabs,
  sortCategoryProducts,
} from "@/lib/product-selection";

/**
 * والبطاقات والسلة — بلا وصف طويل ولا مكونات ولا أسئلة شائعة.
 *
 * نفس الدوال بأسماء تحمل Card بدل Product حتى لا يختلط على القارئ أي طبقة
 * يستخدم؛ ومن يحتاج النص الكامل يستورد `@/data/products` (يُحمَّل عندئذ فقط).
 */
export {
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
  HOMEPAGE_TAB_PICKS,
  HOMEPAGE_TAB_SIZE,
  homepageDisplayedProductIds,
  isHomepageProductEligible,
};
export { productCards };

/** عدد المنتجات في الكتالوج — بلا تحميل أي بيانات نصية. */
export const PRODUCT_COUNT = productCards.length;

/** عدد منتجات كل فئة (للأعداد المعروضة في صفحات الفراغ/واجهة الأقسام). */
export const cardsCountByCategory = (): Record<ProductCategory, number> => ({
  men: productCards.filter((p) => p.category === "men").length,
  women: productCards.filter((p) => p.category === "women").length,
  devices: productCards.filter((p) => p.category === "devices").length,
});

export const getCardById = (id: string): ProductCardView | undefined =>
  productCards.find((p) => p.id === id);

export const getCardBySlug = (slug: string): ProductCardView | undefined =>
  productCards.find((p) => p.slug === slug);

/** أول 6 منتجات في ترتيب الرئيسية — نفس ترتيب الكتالوج الكامل بالحرف. */
export const getFeaturedCards = (): ProductCardView[] => pickHomepageFeatured(getCardById);

/** منتجات فئة كاملة بترتيبها المعتمد (متوفر ← مثبَّت ← مميز ← الأرخص). */
export const getCardsByCategory = (cat: ProductCategory): ProductCardView[] =>
  sortCategoryProducts(
    productCards.filter((p) => p.category === cat),
    cat,
  );

/**
 * بطاقات تبويب القسم في الصفحة الرئيسية — اختيار محرَّر بالجودة والتنوّع
 * (لا الأرخص)، ويتجنّب ما ظهر أعلى الصفحة. راجع `HOMEPAGE_TAB_PICKS`.
 */
export const getHomepageTabCards = (cat: ProductCategory): ProductCardView[] =>
  pickHomepageTabs(cat, getCardById, getCardsByCategory(cat));
