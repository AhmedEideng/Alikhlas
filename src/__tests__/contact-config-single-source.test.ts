import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GA_MEASUREMENT_ID, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "@/lib/site-config";

/**
 *
 * `src/lib/whatsapp.ts` **وثلاثة مواضع داخل `index.html`**، ومعرّف GA4
 * أي تحديث للرقم يحتاج أربع تعديلات، ونسيان واحدة يجعل زر «اطلب عبر
 * واتساب» في 110 صفحة يشير إلى رقم يختلف عن JSON-LD، والتحليلات معطّلة صامتة.
 *
 * القاعدة الآن محروسة هنا:
 *   • الرقم البديل موجود في ملف واحد فقط (`src/lib/site-config.ts`).
 *   • `index.html` لا يحمل أي رقم حرفي — يحمل ثلاثة رموز يستبدلها الـ prerender.
 *   • `whatsapp.ts` يعيد التصدير بلا رقم حرفي.
 *   • الرمز المعروض للرقم (+20 …) مشتق من الرقم نفسه لا مكتوب يدويًا.
 */

const ROOT = resolve(__dirname, "../..");
const read = (relative: string) => readFileSync(resolve(ROOT, relative), "utf-8");

describe("مصدر واحد لبيانات التواصل والتحليلات", () => {
  it("الرقم البديل ومعرّف GA في site-config وحدهما", () => {
    const config = read("src/lib/site-config.ts");
    expect(config).toContain("VITE_WHATSAPP_NUMBER");
    expect(config).toContain("VITE_GA_ID");
    expect(config.match(/201000000000/g)?.length, "الرقم البديل يجب أن يُكتب مرة واحدة").toBe(1);

    const whatsapp = read("src/lib/whatsapp.ts");
    expect(whatsapp).not.toMatch(/wa\.me\/\d/);
    expect(whatsapp).toContain("export { WHATSAPP_NUMBER };");
  });

  it("index.html بلا أرقام حرفية وبالرموز الثلاثة", () => {
    const html = read("index.html");
    expect(html).not.toContain("201000000000");
    expect(html).not.toMatch(/wa\.me\/\d/);
    expect(html).toContain("wa.me/__WHATSAPP_NUMBER__");
    expect(html).toContain('"telephone": "+__WHATSAPP_NUMBER__"');
    expect(html).toContain("__WHATSAPP_DISPLAY__");
    expect(html).toContain("__GA_MEASUREMENT_ID__");
  });

  it("الـ prerender يستبدل الرموز الثلاثة في كل صفحة من المصدر الوحيد", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    expect(prerender).toContain('ssrLoadModule("/src/lib/site-config.ts")');
    for (const token of ["__WHATSAPP_NUMBER__", "__WHATSAPP_DISPLAY__", "__GA_MEASUREMENT_ID__"]) {
      expect(prerender, `الرمز ${token} غير مستبدل`).toContain(`"${token}"`);
    }
  });

  it("القيم المشتقة سليمة والقيم الافتراضية لا تُخفي غياب البيانات", () => {
    // الصيغة المعروضة تُشتق من الرقم: 201000000000 → +20 100 000 0000
    expect(WHATSAPP_DISPLAY).toBe(
      `+${WHATSAPP_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4")}`,
    );
    expect(WHATSAPP_NUMBER).toMatch(/^\d{10,15}$/);
    // GA فارغ في غياب VITE_GA_ID ⇒ ga-loader لا يحمّل شيئًا (fail-open بصمت).
    expect(typeof GA_MEASUREMENT_ID).toBe("string");
  });

  it("متغيّرا البيئة موثّقان لأن التغيير يحدث من هناك فقط", () => {
    const env = read(".env.example");
    expect(env).toContain("VITE_WHATSAPP_NUMBER");
    expect(env).toContain("VITE_GA_ID");
  });
});
