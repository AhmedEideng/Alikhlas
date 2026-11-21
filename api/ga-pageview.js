/**
 * ============================================================
 * GA4 Server-Side Fallback — page_view الاحتياطي من الخادم
 * ============================================================
 * الهوية موحّدة: نفس client_id (كوكي ikhlas_ga_cid) بيُمرَّر لـ gtag config
 * لما يشتغل، فلا تتولد «زيارة مكرّرة» بهوية مختلفة.
 *
 * التفعيل: يحتاج GA_MEASUREMENT_ID و GA_API_SECRET في بيئة النشر.
 * من غيرهما الـ endpoint بيرد 204 كـ no-op آمن.
 * ============================================================
 */

import { getClientIp } from "./lib/request-ip.js";
import { createEndpointRateLimiter } from "./lib/endpoint-rate-limiter.js";
import { allowedOrigins } from "./lib/request-guards.js";

const checkRateLimit = createEndpointRateLimiter({ windowMs: 60_000, max: 30 });

const ALLOWED_ORIGINS = allowedOrigins();

const SITE_ORIGIN = (process.env.SITE_URL || "https://alikhlasmedical.store").replace(/\/$/, "");

/** GA4 client_id format: "<random>.<first-visit-seconds>" */
const CLIENT_ID_PATTERN = /^\d{1,20}\.\d{1,20}$/;

/** @param {unknown} value @returns {string | null} */
function cleanPagePath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/)[0];
  return path.length > 0 && path.length <= 300 ? path : null;
}

/**
 * Build the Measurement Protocol payload, or null for invalid input.
 * Exported for unit tests.
 */
/** @param {unknown} body */
export function buildMeasurementPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const {
    client_id: clientId,
    session_id: sessionId,
    page_path: pagePathRaw,
    page_title: pageTitleRaw,
  } = /** @type {Record<string, unknown>} */ (body);
  if (typeof clientId !== "string" || !CLIENT_ID_PATTERN.test(clientId)) return null;

  const pagePath = cleanPagePath(pagePathRaw);
  if (!pagePath) return null;

  /** @type {Record<string, string | number>} */
  const params = {
    page_location: `${SITE_ORIGIN}${pagePath}`,
    page_title:
      typeof pageTitleRaw === "string"
        ? pageTitleRaw.replace(/\s+/g, " ").trim().slice(0, 200)
        : "",
    engagement_time_msec: 1,
    measurement_source: "server_fallback",
  };
  if (typeof sessionId === "string" && /^\d{1,20}$/.test(sessionId)) {
    params.session_id = Number(sessionId);
  }

  return { client_id: clientId, events: [{ name: "page_view", params }] };
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).end();
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!checkRateLimit(getClientIp(req))) return res.status(429).end();

  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? null);
    if (Buffer.byteLength(rawBody, "utf8") > 4096) return res.status(400).end();
    const body = typeof req.body === "string" ? JSON.parse(rawBody) : req.body;

    const payload = buildMeasurementPayload(body);
    if (!payload) return res.status(400).end();

    const measurementId = (process.env.GA_MEASUREMENT_ID || "").trim();
    const apiSecret = (process.env.GA_API_SECRET || "").trim();
    if (!measurementId || !apiSecret) return res.status(204).end();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }
    return res.status(204).end();
  } catch {
    return res.status(204).end();
  }
}
