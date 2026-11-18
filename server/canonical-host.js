/**
 * ============================================================
 * www → النطاق الأساسي (canonical host) — تكافؤ مع Vercel
 * ============================================================
 * الدالة نقية (pure) لتكون قابلة للاختبار مباشرة.
 * ============================================================
 */

/** النطاق الأساسي المشتق من SITE_URL (افتراضيًا نطاق الإنتاج). */
const DEFAULT_SITE_URL = "https://alikhlasmedical.store";

/**
 * @param {string | undefined} siteUrl قيمة SITE_URL في البيئة.
 * @returns {string} النطاق الأساسي بدون بروتوكول (مثال: `alikhlasmedical.store`).
 */
export function canonicalHost(siteUrl) {
  try {
    return new URL(siteUrl || DEFAULT_SITE_URL).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_SITE_URL).host.toLowerCase();
  }
}

/**
 * يحسب وجهة تحويل www → النطاق الأساسي، أو null إن لم يكن الطلب على www.
 *
 * @param {{ hostHeader?: string, siteUrl?: string, protocol?: string, originalUrl?: string }} input
 * @returns {string | null} رابط مطلق للتحويل، أو null.
 */
export function canonicalHostRedirect({ hostHeader, siteUrl, protocol, originalUrl }) {
  const host = String(hostHeader || "")
    .trim()
    .toLowerCase();
  if (!host.startsWith("www.")) return null;

  const apex = canonicalHost(siteUrl);
  if (host.slice(4) !== apex) return null;

  const scheme = protocol === "http" || protocol === "https" ? protocol : "https";
  const path = originalUrl && originalUrl.startsWith("/") ? originalUrl : "/";
  return `${scheme}://${apex}${path}`;
}
