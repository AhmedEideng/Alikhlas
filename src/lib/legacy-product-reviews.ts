/**
 * تقييمات العملاء المعتمدة المرتبطة بالمنتجات.
 *
 * - تُعرض المراجعات المرتبطة بالمنتج فقط، دون اختيار من مجموعة عامة.
 * - عدد التقييمات المعروض في الـ aggregateRating يطابق أرشيف المنتج بالضبط.
 * - لعلامة تجارية جديدة بلا أرشيف سابق، تبدأ القائمة فارغة ({}) فلا يظهر
 *   أي aggregateRating غير حقيقي في صفحات المنتجات أو الـ JSON-LD.
 */

export interface Review {
  id: number;
  name: string;
  city?: string;
  text: string;
  rating: number;
  date: string;
  helpful: number;
  /** True when the archive supplied an exact calendar date rather than a relative label. */
  fixedDate?: boolean;
}

export type ProductCategory = "men" | "women" | "devices";

/** تاريخ النشر بصيغة ISO 8601 لـ schema فقط (جوجل ترفض ما سواها). */
export function reviewDatePublished(r: Review): string | null {
  if (!r.fixedDate) return null;
  const d = String(r.date).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** عدد الشهادات المعروضة على الصفحة = عدد عناصر review في الـ schema تماماً. */
export const VISIBLE_REVIEW_COUNT = 6;

const ARCHIVED_REVIEWS_BY_PRODUCT: Record<string, Review[]> = {};

interface ProductReviewsResult {
  reviews: Review[];
  rating: number;
  reviewCount: number;
}

/** Only product-linked archives may be displayed; never borrow category reviews. */
export function getArchivedReviewSummary(
  slug: string,
): { rating: number; reviewCount: number } | null {
  const reviews = ARCHIVED_REVIEWS_BY_PRODUCT[slug];
  if (!reviews?.length) return null;
  return {
    rating:
      Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) /
      10,
    reviewCount: reviews.length,
  };
}

export function getProductReviews(
  slug: string,
  category: ProductCategory,
  maxReviews = 5,
): ProductReviewsResult {
  void category;
  const archive = ARCHIVED_REVIEWS_BY_PRODUCT[slug];
  if (!archive?.length) return { reviews: [], rating: 0, reviewCount: 0 };
  const limit = Number.isFinite(maxReviews) ? Math.max(0, Math.floor(maxReviews)) : 0;
  const selected = archive.slice(0, limit);
  const rating = selected.length
    ? Math.round(
        (selected.reduce((sum, review) => sum + review.rating, 0) / selected.length) * 10,
      ) / 10
    : 0;
  return { reviews: selected, rating, reviewCount: selected.length };
}
