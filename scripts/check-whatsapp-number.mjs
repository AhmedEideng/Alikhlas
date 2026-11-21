#!/usr/bin/env node
/**
 * ============================================================
 * حارس رقم الواتساب في البناء النهائي.
 *
 * (2026-11-23) نشر الإنتاج طلع للناس برقم بديل `201000000000` لأن متغيّر
 * `VITE_WHATSAPP_NUMBER` في لوحة Vercel كان بقيمة فاضية، فكل أزرار الواتساب
 * كانت بتفتح رقمًا غير موجود. الاختبارات والـCI ما كانش ممكن يمسكوا ده، لأن
 * البناء على Vercel بيقرأ متغيّرات لوحة النشر لا `.env.production`.
 *
 * الحل الحقيقي: قيمة احتياطية داخل `site-config` + الاختبار ده، اللي بيفشل
 * البناء نفسه لو الرقم البديل ظهر في أي صفحة مبنية. بهذا يستحيل أن يصل رقم
 * وهمي للزائر بصمت.
 * ============================================================
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const PLACEHOLDER = "201000000000";

const PAGES = [
  "index.html",
  "contact.html",
  "products/kreva-advanced-men-gel-50g.html",
  "cart.html",
];

if (!existsSync(resolve(DIST, "index.html"))) {
  console.error("✖ dist غير موجود، شغّل vite build أولًا.");
  process.exit(1);
}

let failed = false;
const numbers = new Set();

for (const page of PAGES) {
  const file = resolve(DIST, page);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf-8");
  for (const match of html.matchAll(/wa\.me\/(\d+)/g)) numbers.add(match[1]);
  if (html.includes(PLACEHOLDER)) {
    console.error(`✖ ${page} يحتوي رقم الواتساب البديل ${PLACEHOLDER}.`);
    failed = true;
  }
  const tel = html.match(/"telephone": "\+(\d+)"/);
  if (tel && tel[1] === PLACEHOLDER) {
    console.error(`✖ ${page}: رقم JSON-LD (telephone) بديل.`);
    failed = true;
  }
}

if (numbers.size === 0) {
  console.error("✖ لم يُعثر على أي رابط wa.me في الصفحات المبنية.");
  failed = true;
}

if (numbers.size > 1) {
  console.error(`✖ أرقام واتساب مختلفة داخل نفس البناء: ${[...numbers].join(", ")}`);
  failed = true;
}

for (const number of numbers) {
  if (!/^\d{10,15}$/.test(number)) {
    console.error(`✖ رقم واتساب غير صالح في البناء: ${number}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nالحل: احذف VITE_WHATSAPP_NUMBER من متغيّرات Vercel (الرقم موجود في .env.production)\n" +
      "أو اضبطه بقيمة صحيحة مثل 201146044715 ثم أعد النشر.",
  );
  process.exit(1);
}

console.log(`✓ رقم الواتساب في البناء سليم: ${[...numbers].join(", ")}`);
