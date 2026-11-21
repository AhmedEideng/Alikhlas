#!/usr/bin/env node
/**
 * ============================================================
 * حارس ربط التحليلات في البناء النهائي.
 *
 * (2026-11-23) خاصية GA4 («الإخلاص ميديكال») فضلت أسبوعًا بصفر بيانات لأن
 * إنشاء الخاصية في لوحة Google لا يرسل شيئًا من نفسه، والمعرّف لازم يوصل
 * للصفحات المبنية. هذا الفحص يوقف البناء لو:
 *   • معرّف GA موجود في `.env.production` ولم يصل لوسم meta في الصفحات.
 *   • المعرّف بصيغة غير صالحة (G-XXXX).
 *   • معرّف GTM موجود في البيئة ولم يصل لوسم السكربت.
 *   • الصيغة المعروضة في meta لا تطابق البيئة.
 * ============================================================
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const env = {};
const envFile = resolve(ROOT, ".env.production");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
}

const gaId = (env.VITE_GA_ID ?? "").toUpperCase();
const gtmId = (env.VITE_GTM_ID ?? "").toUpperCase();

const PAGES = ["index.html", "products/men.html", "products/kreva-advanced-men-gel-50g.html"];
let failed = false;

for (const page of PAGES) {
  const file = resolve(DIST, page);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf-8");

  const meta = html.match(/<meta name="ga-measurement-id" content="([^"]*)"\s*\/?>/);
  const metaValue = meta ? meta[1].trim().toUpperCase() : "";

  if (gaId && !/^G-[A-Z0-9]{6,}$/.test(gaId)) {
    console.error(`✖ معرّف GA4 في .env.production بصيغة غير صالحة: ${gaId}`);
    failed = true;
  }
  if (gaId && metaValue !== gaId) {
    console.error(
      `✖ ${page}: معرّف GA4 في meta («${metaValue}») لا يطابق .env.production («${gaId}»).`,
    );
    failed = true;
  }
  if (gtmId) {
    if (!html.includes(`data-gtm-id="${gtmId}"`)) {
      console.error(`✖ ${page}: حاوية GTM (${gtmId}) مش موجودة في الصفحة.`);
      failed = true;
    }
  }
  // لا يجوز أن يصل رمز غير مستبدل للزوار
  // الرمز في موضعه الفعلي (قيمة الوسم) يعني أن الاستبدال لم يحدث
  if (
    html.includes('content="__GA_MEASUREMENT_ID__"') ||
    html.includes('data-gtm-id="__GTM_ID__"')
  ) {
    console.error(`✖ ${page}: رمز غير مستبدل في قيمة الوسم (GA / GTM).`);
    failed = true;
  }
}

if (failed) {
  console.error("\nراجع src/lib/site-config.ts و scripts/prerender-seo.mjs.");
  process.exit(1);
}

console.log(`✓ التحليلات في البناء سليمة (GA4: ${gaId || "معطّل"} · GTM: ${gtmId || "معطّل"})`);
