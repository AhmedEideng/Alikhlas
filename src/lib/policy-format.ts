import {
  FREE_SHIPPING_THRESHOLD,
  REFUND_PROCESSING_DAYS,
  RETURN_WINDOW_DAYS,
  GOVERNORATE_SHIPPING,
  MEDICAL_SUPERVISOR,
  SHIPPING_DELIVERY_TEXT,
  WHATSAPP_DISPLAY,
} from "@/lib/site-config";
import { formatPrice } from "@/data/product-types";
import type { PolicySlug } from "@/data/policy-meta";

/**
 * أدوات صفحات الثقة — أنواع + استبدال الرموز + تقسيم الروابط.
 *
 * لا تحتوي أي نص طويل: النصوص في `@/data/policy-pages.ts` و
 * `@/data/education-hub.ts`. الفصل مقصود — هذه الأدوات تحتاجها الواجهة
 * وتحتاجها الـ routes لقراءة الـ meta، ولو استُورد ملف النصوص بدلًا منها
 * لدخلت الصفحات كاملة في حزمة المسار الحرج (تجاوز ميزانية JS).
 */
/** أيقونة اختيارية للكارت — تُترجم إلى مكوّن lucide في العارض. */
export type TrustIconName =
  | "award"
  | "alert"
  | "book"
  | "check"
  | "clock"
  | "globe"
  | "headphones"
  | "heart"
  | "lock"
  | "package"
  | "search"
  | "shield"
  | "star"
  | "truck"
  | "users";

export interface TrustCard {
  icon?: TrustIconName;
  title: string;
  text: string;
  meta?: string;
}

export interface PolicySection {
  heading: string;
  /** سطر تعريفي تحت العنوان. */
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  cards?: TrustCard[];
}

/** صفحة تحريرية عامة (سياسة أو صفحة ثقة) — الشكل المشترك لكل الصفحات. */
export interface TrustPage {
  eyebrow: string;
  title: string;
  heroDescription: string;
  updatedAt?: string;
  stats?: { value: string; label: string }[];
  sections: PolicySection[];
}

export interface PolicyPage extends TrustPage {
  slug: PolicySlug;
  path: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
}

/** رموز الروابط الداخلية — تُترجم إلى <Link> في الواجهة و<a> في الـ prerender. */
export const POLICY_LINK_TOKENS: Record<string, { path: string; label: string }> = {
  "{{SHIPPING_LINK}}": { path: "/shipping", label: "سياسة الشحن" },
  "{{RETURNS_LINK}}": { path: "/returns", label: "سياسة الاسترجاع" },
  "{{TERMS_LINK}}": { path: "/terms", label: "الشروط والأحكام" },
  "{{PRIVACY_LINK}}": { path: "/privacy", label: "سياسة الخصوصية" },
  "{{CONTACT_LINK}}": { path: "/contact", label: "صفحة التواصل" },
  "{{EDUCATION_LINK}}": { path: "/education", label: "مكتبة التوعية" },
};

const SHIPPING_FEES = GOVERNORATE_SHIPPING.map((entry) => entry.shipping);

const VALUE_TOKENS: Record<string, string> = {
  "{{FREE_SHIPPING}}": formatPrice(FREE_SHIPPING_THRESHOLD),
  "{{SHIPPING_MIN}}": formatPrice(Math.min(...SHIPPING_FEES)),
  "{{SHIPPING_MAX}}": formatPrice(Math.max(...SHIPPING_FEES)),
  "{{DELIVERY_TEXT}}": SHIPPING_DELIVERY_TEXT,
  "{{GOVERNORATES}}": GOVERNORATE_SHIPPING.map((entry) => entry.name).join("، "),
  "{{WHATSAPP}}": WHATSAPP_DISPLAY,
  "{{RETURN_DAYS}}": String(RETURN_WINDOW_DAYS),
  "{{REFUND_DAYS}}": String(REFUND_PROCESSING_DAYS),
  "{{SUPERVISOR}}": MEDICAL_SUPERVISOR.name,
};

/**
 * استبدال رموز القيم (رسوم، حدود، مدة، محافظات، واتساب، المشرف) بمصادرها.
 * رموز الروابط تبقى كما هي حتى يترجمها كل renderer إلى عنصر <a>/<Link>.
 */
export function policyText(text: string): string {
  let out = text;
  for (const [token, value] of Object.entries(VALUE_TOKENS)) {
    out = out.replaceAll(token, value);
  }
  return out;
}

export type PolicySegment =
  { kind: "text"; value: string } | { kind: "link"; path: string; label: string };

/** تقسيم فقرة إلى نص + روابط داخلية، مع استبدال رموز القيم. */
export function policySegments(text: string): PolicySegment[] {
  const parts = text.split(/(\{\{[A-Z_]+\}\})/g).filter((part) => part.length > 0);
  const segments: PolicySegment[] = [];
  for (const part of parts) {
    const link = POLICY_LINK_TOKENS[part];
    if (link) {
      segments.push({ kind: "link", path: link.path, label: link.label });
      continue;
    }
    const value = policyText(part);
    if (value.length > 0) segments.push({ kind: "text", value });
  }
  return segments;
}

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/**
 * تاريخ التحديث بصيغة عربية مقروءة («16 نوفمبر 2026»).
 * حساب يدوي بلا Intl حتى يتطابق نص الواجهة مع HTML الثابت في كل بيئة.
 */
export function formatPolicyDate(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const monthName = AR_MONTHS[month - 1] ?? "";
  return `${day} ${monthName} ${year}`.trim();
}
