/**
 * ============================================================
 * Al Ikhlas Medical — Security Headers: Single Source of Truth
 * ============================================================
 * المصدر الوحيد لترويسات الأمان؛ المستهلكات:
 *   • server/index.js — يستورد CSP_POLICY + buildReportToHeader مباشرة.
 *   • vercel.json — نسخة مطابقة حرفيًا يفحصها scripts/verify-security-headers.mjs.
 * ============================================================
 */

export const CSP_POLICY = [
  "default-src 'self'",
  // الـ hash يساوي حرفياً سكربت علم الـ first-paint في index.html —
  // يفحصه data-integrity.test.mjs عند كل تغيير (مصدر واحد مضمون).
  "script-src 'self' 'sha256-Etm4YIpaRm/RCwlZgElpJ9d2j/irQhb2aUAeq5DHLrk=' https://www.googletagmanager.com https://www.google-analytics.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.g.doubleclick.net",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com",
  // GTM يفتح iframe احتياطي (ns.html) لمتصفحات بلا جافاسكربت.
  "frame-src https://www.googletagmanager.com",
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
].join("; ");

export const CSP_REPORT_ENDPOINT_OVERRIDE = process.env.CSP_REPORT_ENDPOINT || null;
export const PUBLIC_ORIGIN = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, "") : null;

/**
 * يبني قيمة هيدر Report-To حسب الأولويات:
 *   1. CSP_REPORT_ENDPOINT
 *   2. SITE_URL
 *   3. requestOrigin
 * @param {string} requestOrigin
 */
export function buildReportToHeader(requestOrigin) {
  const url =
    CSP_REPORT_ENDPOINT_OVERRIDE ||
    (PUBLIC_ORIGIN ? `${PUBLIC_ORIGIN}/api/csp-report` : null) ||
    `${requestOrigin}/api/csp-report`;
  return JSON.stringify({
    group: "csp",
    max_age: 10886400,
    endpoints: [{ url }],
  });
}
