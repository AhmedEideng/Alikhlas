import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { resolve } from "node:path";

/**
 * ⚠️ لماذا نحمل `.env.production` هنا؟
 * الاختبارات تُشغَّل بـ mode=test، فتُقرأ `.env` و`.env.test` فقط. الرقم الحقيقي
 * كان موجودًا في `.env` المحلي **غير المُتتبَّع**، فكانت الحزمة تنجح على جهاز
 * المطوّر وتفشل على أي نسخة نظيفة (CI أو استنساخ جديد) لأن `site-config`
 * يرتد إلى الرقم البديل — وهو ما حدث فعلًا في أول تشغيل لـGitHub Actions.
 *
 * الحل: نقرأ `.env.production` (مُتتبَّع) ونضع قيمه في `process.env` **قبل**
 * تقييم أي وحدة، فتكون كل الاختبارات على نفس قيم النشر بلا تكرار للرقم
 * داخل الكود (المصدر يبقى `VITE_WHATSAPP_NUMBER`).
 */
const prodEnv = loadEnv("production", import.meta.dirname, "VITE_");
for (const [key, value] of Object.entries(prodEnv)) {
  if (!process.env[key]) process.env[key] = value;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["src/__tests__/setup.ts"],
    // رانرز GitHub أبطأ من جهاز التطوير: اختبار مصغّرات الصور يمر على 85 صورة
    // بـsharp ويستغرق ~4 ثوانٍ محليًا فيتجاوز حد 5 ثوانٍ الافتراضي على الـCI.
    // رفع المهلة لا يغيّر أي تحقّق — يمنع فشلًا كاذبًا فقط.
    testTimeout: 20_000,
    env: { ...prodEnv },
  },
});
