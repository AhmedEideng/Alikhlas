import { getPublicProductsByCategory } from "@/data/products";
import { getBundleProductType } from "@/lib/product-form";
import { formatPrice, type Product, type ProductCategory } from "@/data/product-types";

/**
 * فهرس الأسعار — مصدر واحد لجدول الأسعار الظاهر في `/products/prices`
 * ولنسخة HTML الثابتة التي يبنيها الـ prerender.
 *
 * لماذا صفحة أسعار؟
 *   • أسئلة السعر («سعر … في مصر») من أعلى نوايا الشراء في البحث المصري،
 *     وكان الموقع يجيب عليها داخل أوصاف صفحات المنتجات فقط.
 *   • الصفحة تصنع روابط داخلية صريحة إلى كل منتج في الكتالوج (85 صفحة)
 *     من نقطة واحدة، فيسهل الزحف وتوزيع الأهمية.
 *
 * قواعد:
 *   • الأرقام تُقرأ من الكتالوج — لا سعر مكتوب يدويًا هنا.
 *   • الترتيب تصاعدي بالسعر داخل كل قسم: هذا هو السؤال الحقيقي للقارئ.
 */

export interface PriceRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  priceLabel: string;
  family: string;
  category: ProductCategory;
}

export type CategoryHref = "/products/men" | "/products/women" | "/products/devices";

export interface PriceGroup {
  key: ProductCategory;
  label: string;
  href: CategoryHref;
  rows: PriceRow[];
  min: number;
  max: number;
}

const CATEGORY_META: Record<ProductCategory, { label: string; href: CategoryHref }> = {
  men: { label: "منتجات الرجال", href: "/products/men" },
  women: { label: "منتجات النساء", href: "/products/women" },
  devices: { label: "الأجهزة والمستلزمات", href: "/products/devices" },
};

/**
 * أسماء الأشكال بالعربية — العمود يُقرأ بالقارئ المصري، لا بمفتاح داخلي
 * إنجليزي (`honey` / `digital-pump`). أي شكل جديد يسقط على «منتج» بلا خطأ.
 */
const FAMILY_LABELS: Record<string, string> = {
  tablet: "أقراص",
  capsule: "كبسولات",
  gel: "جل موضعي",
  cream: "كريم",
  honey: "عسل",
  chocolate: "شوكولاتة",
  spray: "بخاخ",
  drops: "قطرات",
  gum: "علكة",
  wipes: "مناديل",
  sachet: "أكياس",
  coffee: "قهوة",
  "digital-pump": "مضخة رقمية",
  "vacuum-kit": "حقيبة تفريغ",
  "manual-pump": "مضخة يدوية",
  "breast-kit": "حقيبة صدر",
  "traction-device": "جهاز شد",
  "electric-pump": "مضخة كهربائية",
  other: "منتج",
};

const toRow = (product: Product): PriceRow => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  price: product.price,
  priceLabel: formatPrice(product.price),
  family: FAMILY_LABELS[getBundleProductType(product)] ?? "منتج",
  category: product.category,
});

export const priceGroups: PriceGroup[] = (["men", "women", "devices"] as const).map((key) => {
  const rows = getPublicProductsByCategory(key)
    .map(toRow)
    .filter((row) => row.price > 0)
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "ar"));
  return {
    key,
    label: CATEGORY_META[key].label,
    href: CATEGORY_META[key].href,
    rows,
    min: rows[0]?.price ?? 0,
    max: rows[rows.length - 1]?.price ?? 0,
  };
});

export const priceRowCount = priceGroups.reduce((total, group) => total + group.rows.length, 0);

const everyPrice = priceGroups
  .flatMap((group) => group.rows.map((row) => row.price))
  .sort((a, b) => a - b);

export const priceRange = {
  count: priceRowCount,
  min: everyPrice[0] ?? 0,
  max: everyPrice[everyPrice.length - 1] ?? 0,
  minLabel: formatPrice(everyPrice[0] ?? 0),
  maxLabel: formatPrice(everyPrice[everyPrice.length - 1] ?? 0),
};
