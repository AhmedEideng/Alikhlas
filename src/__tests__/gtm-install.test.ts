import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GTM_CONTAINER_ID } from "@/lib/site-config";

/**
 * (2026-11-23) تركيب Google Tag Manager بناءً على طلب المالك.
 *
 * المبدأ: لا معرّف مكتوب حرفيًا في أي ملف واجهة. `index.html` يحمل الرمز
 * `__GTM_ID__` داخل كتلتين محصورتين بين `gtm:start` و`gtm:end`، والـ prerender
 * يستبدله من `site-config`، ولو كان المعرّف فارغًا تُحذف الكتلتان بالكامل
 * (تطوير/معاينة) فلا طلب شبكة لجوجل ولا iframe بعنوان ناقص.
 *
 * الحاوية تُحمَّل من ملف على نطاقنا (`/gtm-init.js`) لأن سياسة CSP عندنا لا
 * تسمح بسكربتات مضمَّنة بلا hash، فلا نحتاج تعديل السياسة مع كل تغيير.
 */

const ROOT = resolve(__dirname, "../..");
const read = (relative: string) => readFileSync(resolve(ROOT, relative), "utf-8");

describe("Google Tag Manager wiring", () => {
  it("accepts a container id only in a well-formed shape (empty = disabled)", () => {
    // GTM موقوف الآن لصالح GA4 مباشرة، فالقيمة الفاضية سلوك مقصود.
    expect(GTM_CONTAINER_ID === "" || /^GTM-[A-Z0-9]{4,}$/.test(GTM_CONTAINER_ID)).toBe(true);
    const env = read(".env.production");
    expect(env).toMatch(/^VITE_GTM_ID=\s*$/m);
  });

  it("keeps the container id out of index.html (token only)", () => {
    const html = read("index.html");
    expect(html).not.toMatch(/GTM-M4M8HHJT/);
    expect(html).toContain('data-gtm-id="__GTM_ID__"');
    expect(html).toContain("__GTM_ID__");
    expect(html.match(/gtm:start/g)?.length).toBe(2);
    expect(html.match(/gtm:end/g)?.length).toBe(2);
    // الوسم يعمل بلا جافاسكربت كذلك
    expect(html).toContain("https://www.googletagmanager.com/ns.html?id=__GTM_ID__");
  });

  it("bootstraps from a same-origin file and validates the id at runtime", () => {
    const script = read("public/gtm-init.js");
    expect(script).toContain('getAttribute("data-gtm-id")');
    expect(script).toContain("/^GTM-[A-Z0-9]{4,}$/");
    expect(script).toContain("https://www.googletagmanager.com/gtm.js?id=");
    expect(script).toContain('"gtm.start"');
  });

  it("replaces the token at build time and drops the block when unset", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    expect(prerender).toContain('replaceAll("__GTM_ID__", CONTACT.gtm)');
    expect(prerender).toContain("gtm:start");
    expect(prerender).toContain("gtm:end");
    expect(prerender).toContain("GTM_CONTAINER_ID");
    // قراءة .env.production ضرورية لأن خادم الـSSR يعمل في وضع development
    expect(prerender).toContain("readProductionEnv");
  });

  it("allows the Google hosts the container needs, without loosening scripts", () => {
    const csp = read("config/security-headers.mjs");
    expect(csp).toContain("frame-src https://www.googletagmanager.com");
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://*.googletagmanager.com");
    // لا نفتح باب السكربتات المضمَّنة لهذا الوسم
    const scriptSrc = csp
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith('"script-src '));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("keeps exactly one analytics channel active at a time", () => {
    // 🚨 (2026-11-23) تشغيل GTM وgtag.js معًا على نفس dataLayer يجعل الأحداث
    // تُستهلك بلا وسم يرسلها (ونفس التحذير يظهر في لوحة GA). القاعدة: قناة
    // واحدة مفعّلة في .env.production، والثانية معرّفها فارغ.
    const env = read(".env.production");
    const gtm = env.match(/^VITE_GTM_ID=(.*)$/m)?.[1]?.trim() ?? "";
    const ga = env.match(/^VITE_GA_ID=(.*)$/m)?.[1]?.trim() ?? "";
    expect(Boolean(gtm) !== Boolean(ga), "لا يجوز تفعيل GTM وGA4 في نفس الوقت").toBe(true);
    expect(read(".env.example")).toContain("VITE_GTM_ID=");
    expect(read(".env.example")).toContain("VITE_GA_ID=");
  });

  it("always reports into the QA build guard", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("check-analytics.mjs");
  });
});
