/**
 * Shared request guards for serverless handlers.
 * Endpoint-specific origin sets and body-size limits are passed by the caller.
 */

/**
 *
 * reviews) تضيف SITE_URL وVERCEL_URL وlocalhost، وثلاثة (ga-pageview ·
 * errors · csp-report) تُثبّت النطاقين فقط. النتيجة أن **أي بيئة غير
 * من نقاط القياس نفسها، فيضيع الـ fallback الذي بُني أصلًا لالتقاط الزيارات
 * المفقودة، وتضيع تقارير الأخطاء وCSP بلا أثر مطلق.
 *
 * تُقرأ المتغيرات **وقت الاستدعاء** لا وقت التحميل، حتى تعمل الاختبارات
 * والتحقق اليدوي بتغيير البيئة دون إعادة استيراد الوحدة.
 */
export const CANONICAL_ORIGINS = [
  "https://alikhlasmedical.store",
  "https://www.alikhlasmedical.store",
];

/** @param {Record<string, string | undefined>} [env] */
export function allowedOrigins(env = process.env) {
  return new Set(
    [
      ...CANONICAL_ORIGINS,
      env.SITE_URL,
      // معاينات Vercel لها نطاق عشوائي لكل نشرة — مسموح بها خارج الإنتاج فقط.
      env.VERCEL_URL && env.VERCEL_ENV !== "production" ? `https://${env.VERCEL_URL}` : undefined,
      env.NODE_ENV !== "production" ? "http://localhost:8080" : undefined,
    ].filter(Boolean),
  );
}

/** @param {import("express").Request} req @returns {string | undefined} */
export function getRequestOrigin(req) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === "string" && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * أصل الطلب كما خدمه هذا النشر فعليًا (https://<host>) — من `x-forwarded-proto`
 * لأن Vercel/البروكسي بيحطوه، و`http` في التطوير المحلي.
 * @param {import("express").Request} req
 * @returns {string | undefined}
 */
export function requestHostOrigin(req) {
  const host = req.headers.host;
  if (!host) return undefined;
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto =
    typeof protoHeader === "string" && protoHeader ? protoHeader.split(",")[0].trim() : "https";
  return `${proto === "http" ? "http" : "https"}://${host}`;
}

/**
 * @param {import("express").Request} req
 * @param {{ has: (origin: string) => boolean }} allowedOrigins
 */
export function isAllowedOrigin(req, allowedOrigins) {
  const origin = getRequestOrigin(req);
  if (origin && allowedOrigins.has(origin)) return true;

  // 🔓 نفس الأصل (Same-Origin) مسموح دائمًا، أيًا كانت البيئة:
  // الصفحة اللي بعتت الطلب اتقدّمت من نفس الـ host، والمتصفح هو اللي بيحدد
  // قيمة Origin — موقع تالت لا يستطيع انتحال أصلنا، فالقاعدة دي لا تفتح
  // باب CSRF. السبب العملي: نشرات المعاينة/الـ deployment على
  // *.vercel.app ما كانتش موجودة في القائمة (VERCEL_ENV=production)،
  // فكان العميل يرى «تعذّر تسجيل طلبك» وكل الكتابة تُرفض بـ403 رغم أن
  // الإعدادات سليمة تمامًا.
  const hostOrigin = requestHostOrigin(req);
  if (origin && hostOrigin && origin === hostOrigin) return true;

  const secFetchSite = req.headers["sec-fetch-site"];
  return Boolean(
    !origin &&
    hostOrigin &&
    allowedOrigins.has(hostOrigin) &&
    (secFetchSite === "same-origin" || secFetchSite === "none"),
  );
}

/**
 * Parse an already-read or platform-parsed body while enforcing the same byte
 * limit in both deployment adapters (including chunked, pre-parsed requests).
 * @param {import("express").Request} req
 * @param {number} maxBodySizeBytes
 * @returns {any}
 */
export function readPayload(req, maxBodySizeBytes) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > maxBodySizeBytes) throw new Error("Payload too large");
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > maxBodySizeBytes)
      throw new Error("Payload too large");
    return JSON.parse(req.body || "{}");
  }
  if (req.body !== undefined) {
    // Vercel supplies an already-parsed object, so content-length is not
    // sufficient when the request used chunked transfer encoding.
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, "utf8") > maxBodySizeBytes)
      throw new Error("Payload too large");
  }
  return req.body === undefined ? {} : req.body;
}
