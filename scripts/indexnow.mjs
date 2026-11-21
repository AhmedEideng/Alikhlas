#!/usr/bin/env node
/**
 * ============================================================
 * IndexNow — إبلاغ Bing/Yandex (ومحركات تدعم البروتوكول) بالروابط
 * المحدَّثة فورًا بدل انتظار الزحف الطبيعي.
 *
 *   npm run indexnow            # يرسل روابط sitemap.xml
 *   npm run indexnow -- --all   # نفس السلوك (كل روابط الموقع)
 *
 * المتطلبات:
 *   • مفتاح في config/indexnow.json، وملف تحقّق منشور على جذر الموقع
 *     بالاسم `<key>.txt` يحتوي المفتاح نفسه (public/<key>.txt).
 *   • شغّله **بعد** نشر آخر بناء (الـ deploy) لا قبله.
 *
 * لا يُرسل أكثر من 10,000 رابط في طلب واحد (حد البروتوكول).
 * ============================================================
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(ROOT, "config/indexnow.json");

if (!existsSync(configPath)) {
  console.error("✖ config/indexnow.json غير موجود، شغّل أولًا: npm run sitemap");
  process.exit(1);
}

const { key } = JSON.parse(readFileSync(configPath, "utf-8"));
if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error("✖ مفتاح IndexNow غير صالح.");
  process.exit(1);
}
if (!existsSync(resolve(ROOT, "public", `${key}.txt`))) {
  console.error(`✖ ملف التحقق public/${key}.txt غير موجود، لن يقبل المحرك الطلب.`);
  process.exit(1);
}

const sitemapPath = resolve(ROOT, "public/sitemap.xml");
if (!existsSync(sitemapPath)) {
  console.error("✖ public/sitemap.xml غير موجود، شغّل: node scripts/generate-sitemap.mjs");
  process.exit(1);
}

const sitemap = readFileSync(sitemapPath, "utf-8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (urls.length === 0) {
  console.error("✖ لا توجد روابط في الخريطة.");
  process.exit(1);
}

const host = new URL(urls[0]).host;
const batch = urls.slice(0, 10000);
const body = { host, key, keyLocation: `https://${host}/${key}.txt`, urlList: batch };

console.log(`📡 IndexNow: إرسال ${batch.length} رابطًا إلى ${host} …`);

try {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (response.ok) {
    console.log(`✅ تم القبول (HTTP ${response.status})، لا حاجة لإعادة الإرسال.`);
  } else {
    // (2026-11-23) نطبع جسم الرد لأنه يحدد السبب بدقة: المفتاح، أم الموقع غير
    // مضاف في Bing Webmaster Tools، أم الملف غير قابل للوصول.
    const text = await response.text().catch(() => "");
    console.error(`✖ رفض المحرك الطلب (HTTP ${response.status}).`);
    if (text) console.error(`   الرد: ${text.slice(0, 300)}`);
    if (/UserForbiddedToAccessSite/i.test(text)) {
      console.error(
        "   المعنى: المفتاح سليم وملف التحقق منشور، لكن الموقع غير مضاف/موثّق في\n" +
          "   Bing Webmaster Tools. أضِف النطاق هناك (أو استورد من Search Console)\n" +
          "   ثم أعد الأمر. ملاحظة: Yandex يقبل الإرسال بدون هذه الخطوة.",
      );
    }
    process.exit(1);
  }
} catch (error) {
  console.error("✖ فشل الاتصال بـ IndexNow:", error.message);
  process.exit(1);
}
