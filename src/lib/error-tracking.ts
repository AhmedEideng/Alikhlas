/**
 * ============================================================
 * Error Tracking — lightweight, Sentry-compatible interface
 * ============================================================
 * Captures uncaught errors and forwards them to a configured
 * sink. Defaults to console-only in dev; in production, set
 * VITE_ERROR_SINK_URL to a Sentry-compatible HTTPS endpoint.
 *
 * Features:
 *   • Correlation ID per session (groups errors by user session)
 *   • Breadcrumbs (last N user actions before crash)
 *   • Browser context (screen size, connection type, memory)
 *   • Automatic global error/unhandledrejection listeners
 *
 * Why not use Sentry SDK? Bundle size — this ships at < 2KB.
 * ============================================================
 */

import { APP_VERSION } from "./version";

/**
 * PII-safe error context — explicit allowlist, no open index signature:
 * a future developer CANNOT attach phone/name/address/userId to an error
 * report without a deliberate change to this type. Session correlation
 * uses the pseudonymous correlationId, not any customer identifier.
 */
interface ErrorContext {
  feature?: string;
  route?: string;
  section?: string;
  componentStack?: string;
  /** اسم ملف السكربت الذي حدث فيه الخطأ (تقني — ليس PII) */
  source?: string;
  lineno?: number;
  colno?: number;
}

// الحقل الوحيد المستعمل في الـ breadcrumbs فعلًا هو href (نقرات اللينكات).
// أي حقل جديد = تغيير مقصود ومُراجَع للنوع ده (نفس فلسفة ErrorContext) —
// على breadcrumb من غير ما حد يلحظ.
interface BreadcrumbData {
  /** href اللينك النُقِر عليه — معقّم عبر toBreadcrumbHref (بلا query/hash) */
  href?: string;
}

interface Breadcrumb {
  type: "click" | "navigation" | "fetch" | "error" | "custom";
  message: string;
  timestamp: string;
  data?: BreadcrumbData;
}

// `connect-src 'self'` تسمح بيه من غير ما نضيف domain خارجي (النسخة
// لو حابب sink خارجي (Sentry-compatible): اضبط VITE_ERROR_SINK_URL
// وإيداف domainه في connect-src (server/index.js + vercel.json).
const SINK_URL = import.meta.env.VITE_ERROR_SINK_URL || "/api/errors";
const IS_PROD = import.meta.env.PROD;
const MAX_BREADCRUMBS = 20;

// ── Correlation ID: stable per page-session ──
let correlationId: string | null = null;

// المتصفحات الحديثة) بدل Math.random — للـ correlation ID بس (مش security
// secret)، بس مفيش سبب نستخدم RNG ضعيف وهو متاح قوي.
function secureTokenHex(chars: number): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "").slice(0, chars);
    }
    const arr = new Uint8Array(Math.ceil(chars / 2));
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, chars);
  } catch {
    return Math.random()
      .toString(36)
      .slice(2, 2 + chars);
  }
}

function getCorrelationId(): string {
  if (correlationId) return correlationId;

  if (typeof window !== "undefined") {
    try {
      // Reuse or create a session-scoped ID
      let sid = sessionStorage.getItem("ikhlas_cid");
      if (!sid) {
        sid = secureTokenHex(8);
        sessionStorage.setItem("ikhlas_cid", sid);
      }
      correlationId = sid;
      return sid;
    } catch {
      // sessionStorage unavailable — use memory-only
    }
  }

  if (!correlationId) {
    correlationId = secureTokenHex(8);
  }
  return correlationId;
}

// ── Breadcrumbs ──
const breadcrumbs: Breadcrumb[] = [];

// `target.href` الكامل ممكن ياخد query string وفيه بيانات عميل
// لـ error logs. القاعدة:
//   • نفس الأصل → pathname بس (مفيش query/hash).
//   • خارجي → protocol + host + path (مفيش query/hash) — معرفة
//     إن المستخدم انزل لفين مفيدة في الـ debug.
//   • tel:/mailto:/javascript: → اسم الـ protocol بس — الـ payload
//     (الرقم/الإيميل) هو نفسه PII.
// exported for unit tests (PII stripping — P2 #10).
export function toBreadcrumbHref(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return u.protocol.replace(":", ""); // "tel" / "mailto" / "javascript"
    }
    if (u.origin === window.location.origin) return u.pathname;
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    // URL مش صالح — نشيل كل اللي بعد أول ? أو #
    return url.split(/[?#]/)[0] || "invalid-url";
  }
}

/**
 * Record a breadcrumb — a user action that happened before an error.
 * Helps debug: "user clicked checkout, then the error happened."
 */
function addBreadcrumb(type: Breadcrumb["type"], message: string, data?: BreadcrumbData) {
  breadcrumbs.push({
    type,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

function getBreadcrumbsSnapshot(): Breadcrumb[] {
  return [...breadcrumbs];
}

// ── Browser context ──
function getBrowserContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const nav = window.navigator;

  return {
    userAgent: nav.userAgent,
    language: nav.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    connectionType:
      (nav as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType ||
      "unknown",
    deviceMemory: (nav as unknown as { deviceMemory?: number }).deviceMemory || "unknown",
    online: nav.onLine,
    timestamp: new Date().toISOString(),
  };
}

// ── Send ──
async function send(event: Record<string, unknown>) {
  if (!SINK_URL) {
    if (!IS_PROD) {
      console.warn("[error-tracking]", event);
    }
    return;
  }
  try {
    await fetch(SINK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Never let error tracking crash the app
  }
}

function sanitiseError(err: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "UnknownError", message: String(err) };
}

/**
 * Manually report an error. Safe to call anywhere.
 */
export function reportError(error: unknown, context: ErrorContext = {}) {
  const err = sanitiseError(error);

  void send({
    type: "error",
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    correlationId: getCorrelationId(),
    route: context.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
    breadcrumbs: getBreadcrumbsSnapshot(),
    browser: getBrowserContext(),
    ...context,
    error: err,
  });
}

// ── Auto-install navigation breadcrumbs ──
function installBreadcrumbListeners() {
  if (typeof window === "undefined") return;

  // Navigation
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);

  // string (نفس مشكلة الـ href في النقرات) — بنعقّمه بنفس القاعدة.
  const navLabel = (args: Parameters<typeof pushState>): string => {
    const urlArg = args[2];
    if (typeof urlArg === "string") return toBreadcrumbHref(urlArg);
    if (urlArg instanceof URL) return toBreadcrumbHref(urlArg.href);
    return "(بدون تغيير URL)";
  };

  history.pushState = (...args) => {
    addBreadcrumb("navigation", `pushState → ${navLabel(args)}`);
    return pushState(...args);
  };
  history.replaceState = (...args) => {
    addBreadcrumb("navigation", `replaceState → ${navLabel(args)}`);
    return replaceState(...args);
  };

  // Clicks (only capture interactive element clicks)
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName?.toLowerCase() || "unknown";
      const text = (target.textContent || "").slice(0, 50);
      if (tag === "a" || tag === "button") {
        // (P2 #10: PII leak).
        addBreadcrumb("click", `${tag}: ${text}`, {
          href: tag === "a" ? toBreadcrumbHref((target as HTMLAnchorElement).href) : undefined,
        });
      }
    },
    { passive: true },
  );
}

/**
 * Install global listeners for `error` and `unhandledrejection`.
 * Call once at app bootstrap (in __root.tsx).
 */
export function installErrorTracking() {
  if (typeof window === "undefined") return;
  if (
    (
      window as unknown as {
        __ikhlasErrorTrackingInstalled?: boolean;
      }
    ).__ikhlasErrorTrackingInstalled
  )
    return;
  (
    window as unknown as { __ikhlasErrorTrackingInstalled?: boolean }
  ).__ikhlasErrorTrackingInstalled = true;

  installBreadcrumbListeners();

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      feature: "global",
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { feature: "promise" });
  });
}
