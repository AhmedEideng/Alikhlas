import { getPromoTier, isPromotionEnabled, PROMO_ORDER_LABEL } from "@/lib/promo";
import { BUNDLE_DISCOUNT_PERCENT, WHATSAPP_NUMBER } from "@/lib/site-config";
import { MAX_CUSTOMER_PHONE_LENGTH, sanitizeForMsg } from "@/lib/utils";

// رقم الواتساب الرسمي للشركة — يُعاد تصديره من المصدر الوحيد `site-config`
// (يُضبط من VITE_WHATSAPP_NUMBER وقت البناء). لا تكتب رقمًا هنا أبدًا.
export { WHATSAPP_NUMBER };

export const COMPANY = {
  name: "الإخلاص ميديكال",
  nameEn: "Al Ikhlas Medical",
  email: "info@alikhlasmedical.store",
  address: "القاهرة، جمهورية مصر العربية",
};

export const waLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/**
 * تاريخ الطلب بصيغة مصرية ثابتة (توقيت القاهرة — الشركة) وأرقام لاتينية
 * لمطابقة بقية الرسالة (الأسعار). التاريخ فقط (بدون وقت).
 */
export const formatOrderDate = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Cairo",
  })
    .format(date)
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");

export interface OrderItemMsg {
  id?: string;
  /** Pretty URL slug used to build product links. */
  slug?: string;
  name: string;
  qty: number;
  /** السعر الفردي للمنتج */
  price: number;
  /** للحفاظ على التوافق — السعر الأصلي = السعر الفردي في النظام الجديد */
  originalPrice?: number;
}

export const buildOrderMessage = (
  items: OrderItemMsg[],
  customer?: {
    name?: string;
    phone?: string;
    governorate?: string;
    address?: string;
    notes?: string;
  },
  orderId?: string,
  shipping?: number,
  freeShipping = false,
  bundleDiscount = 0,
) => {
  const lines: string[] = [];
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://alikhlasmedical.store";

  const subtotalBefore = items.reduce(
    (sum, it) => sum + (it.originalPrice ?? it.price) * it.qty,
    0,
  );
  const tier = isPromotionEnabled() ? getPromoTier(subtotalBefore) : null;
  const bundleActive = !!bundleDiscount && bundleDiscount > 0;
  const discount = bundleActive ? 0 : tier ? Math.round(subtotalBefore * tier.discount) : 0;
  const subtotalAfter = subtotalBefore - discount - (bundleDiscount || 0);

  lines.push("👇 اضغط إرسال الآن لتأكيد طلبك وتجهيز الشحن الفوري 🚚");
  lines.push("----------------------------------------");
  lines.push("طلب جديد من الإخلاص ميديكال");
  if (orderId) lines.push(`رقم الطلب: ${orderId}`);
  lines.push(`التاريخ: ${formatOrderDate()}`);
  if (discount > 0 || bundleActive) lines.push(PROMO_ORDER_LABEL);
  lines.push("");

  if (customer?.name) lines.push(`الاسم: ${sanitizeForMsg(customer.name, 100)}`);
  if (customer?.phone)
    lines.push(`الهاتف: ${sanitizeForMsg(customer.phone, MAX_CUSTOMER_PHONE_LENGTH)}`);
  if (customer?.governorate) lines.push(`المحافظة: ${sanitizeForMsg(customer.governorate, 50)}`);
  lines.push(
    `العنوان: ${customer?.address ? sanitizeForMsg(customer.address, 200) : "سيتم تأكيده على واتساب"}`,
  );
  if (customer?.notes) lines.push(`ملاحظات: ${sanitizeForMsg(customer.notes, 300)}`);
  lines.push("");

  lines.push("المنتجات:");
  items.forEach((it, i) => {
    const unitPrice = it.originalPrice ?? it.price;
    lines.push(`المنتج ${i + 1}: ${sanitizeForMsg(it.name, 150)}`);
    lines.push(`عدد العبوات: ${it.qty}`);
    lines.push(`سعر العبوة: ${unitPrice} ج.م`);
    const linkKey = it.slug ?? it.id;
    if (linkKey) lines.push(`${origin}/products/${linkKey}`);
    if (i < items.length - 1) lines.push("");
  });

  lines.push("");
  lines.push(`المجموع: ${subtotalBefore} ج.م`);
  if (bundleActive) lines.push(`خصم الباقة (${BUNDLE_DISCOUNT_PERCENT}%): -${bundleDiscount} ج.م`);
  else if (tier && discount > 0) lines.push(`خصم ${tier.label}: -${discount} ج.م`);
  if (freeShipping) lines.push("الشحن: مجاني");
  else if (shipping && shipping > 0) lines.push(`الشحن: ${shipping} ج.م`);
  lines.push(`الإجمالي: ${subtotalAfter + (shipping || 0)} ج.م`);

  return lines.join("\n");
};
