#!/usr/bin/env node
/**
 * ============================================================
 * مولّد بطاقة المشاركة الافتراضية (og-default.jpg) — 1200×630.
 *
 * (2026-11-23) قرار المالك: النسخة القديمة كانت تحط شعار المتجر داخل لوحة
 * بيضاء بمساحات فاضية كبيرة، فكان الشعار والاسم يطلعوا صغارين وأقرب
 * لغير المقروءين في معاينة واتساب (الحجم الفعلي في المحادثة ~260px عرضًا).
 *
 * القواعد الجديدة:
 *   • الاسم «الإخلاص ميديكال» نص حقيقي بخط Cairo العريض، مش صورة مرسومة،
 *     فيبقى واضحًا مهما صغر حجم المعاينة.
 *   • الشعار (العَلامة) بحجم كبير بلا لوحة بيضاء ولا مساحات ميتة.
 *   • سطر واحد كبير بدل ثلاث طبقات صغيرة.
 *
 * التشغيل:  node scripts/generate-og-default.mjs
 * المخرجات: public/og-default.jpg (نفس المسار المستخدم في كل الصفحات،
 * والـ prerender هو الذي يعلن عرضها وارتفاعها الفعليين).
 * ============================================================
 */
import { readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONT = pathToFileURL(resolve(ROOT, "public/fonts/cairo.woff2")).href;
const MARK = `data:image/png;base64,${readFileSync(
  resolve(ROOT, "public/favicon-512x512.png"),
).toString("base64")}`;
const OUT = resolve(ROOT, "public/og-default.jpg");

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "CairoCard";
    src: url("${FONT}") format("woff2");
    font-weight: 200 1000;
    font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: "CairoCard", sans-serif;
    background:
      radial-gradient(880px 520px at 82% -14%, rgba(232,196,115,0.28), transparent 62%),
      radial-gradient(760px 460px at 14% 112%, rgba(24,140,80,0.40), transparent 66%),
      linear-gradient(135deg, #072a1b 0%, #0b3b26 46%, #0e4a2f 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 60px;
    position: relative;
    overflow: hidden;
  }
  .frame {
    position: absolute;
    inset: 22px;
    border: 2px solid rgba(232,196,115,0.55);
    border-radius: 34px;
    pointer-events: none;
  }
  .glow {
    position: absolute;
    width: 780px; height: 780px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,196,115,0.15), transparent 62%);
    top: -360px; left: -180px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 26px;
    z-index: 2;
  }
  .mark {
    width: 172px; height: 172px;
    filter: drop-shadow(0 14px 26px rgba(0,0,0,0.42));
    flex: 0 0 auto;
  }
  .brandText { text-align: right; }
  .name {
    font-size: 86px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -1px;
    background: linear-gradient(180deg, #fff6dd 8%, #e8c473 58%, #cc9f38 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    white-space: nowrap;
  }
  .sub {
    margin-top: 6px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 6px;
    color: rgba(255,255,255,0.78);
    white-space: nowrap;
  }
  .headline {
    margin-top: 30px;
    font-size: 86px;
    font-weight: 900;
    line-height: 1.12;
    letter-spacing: -2px;
    z-index: 2;
  }
  .headline .line { display: block; white-space: nowrap; }
  .headline .gold { color: #f0cf83; }
  .pill {
    margin-top: 30px;
    display: inline-flex;
    align-items: center;
    gap: 14px;
    padding: 12px 30px;
    border-radius: 999px;
    border: 2px solid rgba(232,196,115,0.60);
    background: rgba(255,255,255,0.09);
    font-size: 38px;
    font-weight: 800;
    color: #fdf6e3;
    white-space: nowrap;
    z-index: 2;
  }
  .dot { width: 13px; height: 13px; border-radius: 50%; background: #e8c473; }
</style>
</head>
<body>
  <div class="frame"></div>
  <div class="glow"></div>

  <div class="brand">
    <img class="mark" src="${MARK}" alt="" />
    <div class="brandText">
      <div class="name">الإخلاص ميديكال</div>
      <div class="sub">AL IKHLAS MEDICAL</div>
    </div>
  </div>

  <div class="headline">
    <span class="line">الصحة الزوجية</span>
    <span class="line gold">بخصوصية كاملة</span>
  </div>
  <div class="pill"><span class="dot"></span>دفع عند الاستلام</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(180);
const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

await sharp(png).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(OUT);
const meta = await sharp(OUT).metadata();
const kb = Math.round(statSync(OUT).size / 1024);
console.log(`✓ og-default.jpg: ${meta.width}×${meta.height} · ${kb} KB`);
