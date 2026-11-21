import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FALLBACK_WHATSAPP_NUMBER,
  WHATSAPP_DISPLAY,
  WHATSAPP_IS_PLACEHOLDER,
  WHATSAPP_NUMBER,
  isValidWhatsAppNumber,
} from "@/lib/site-config";

/**
 * (2026-11-23) نشر الإنتاج طلع برقم واتساب بديل `201000000000` لأن متغيّر
 * `VITE_WHATSAPP_NUMBER` في لوحة Vercel كان بقيمة فاضية، وVite يعطي متغيّرات
 * البيئة الحقيقية أولوية على `.env.production`. النتيجة: كل أزرار الواتساب في
 * الموقع كانت بتفتح رقمًا غير موجود، والطلبات ما كانتش بتوصل.
 *
 * الحراسة الآن على ثلاث طبقات:
 *   1. قيمة احتياطية في `site-config` مطابقة لـ`.env.production` (يُختبر هنا).
 *   2. رفض أي قيمة بيئة غير صالحة (فاضية/حروف/قصيرة) والرجوع للاحتياطي.
 *   3. `scripts/check-whatsapp-number.mjs` يفشل البناء لو ظهر الرقم البديل
 *      في أي صفحة مبنية.
 */

const ROOT = resolve(__dirname, "../..");

const envProductionValue = (() => {
  const raw = readFileSync(resolve(ROOT, ".env.production"), "utf-8");
  const line = raw.split("\n").find((row) => row.startsWith("VITE_WHATSAPP_NUMBER="));
  return (line ?? "").split("=")[1]?.replace(/[^\d]/g, "") ?? "";
})();

describe("WhatsApp number cannot silently fall back to a fake number", () => {
  it("keeps the in-code fallback identical to .env.production", () => {
    expect(envProductionValue).toMatch(/^\d{10,15}$/);
    expect(FALLBACK_WHATSAPP_NUMBER).toBe(envProductionValue);
  });

  it("never ships the placeholder when the environment is missing or empty", () => {
    // القيمة الفعلية في الاختبار تُقرأ من .env.production (vitest env)، والاحتياطي
    // يكفل ألّا يكون الرقم البديل حتى لو غاب المتغيّر في بيئة النشر.
    expect(WHATSAPP_IS_PLACEHOLDER).toBe(false);
    expect(WHATSAPP_NUMBER).toBe(FALLBACK_WHATSAPP_NUMBER);
    expect(WHATSAPP_DISPLAY).toBe("+20 114 604 4715");
  });

  it("rejects invalid environment values and accepts real ones", () => {
    expect(isValidWhatsAppNumber("")).toBe(false);
    expect(isValidWhatsAppNumber("201")).toBe(false);
    expect(isValidWhatsAppNumber("20114604")).toBe(false);
    expect(isValidWhatsAppNumber("201146044715")).toBe(true);
    expect(isValidWhatsAppNumber("971501234567")).toBe(true);
  });

  it("builds the display format from the number itself", () => {
    expect(WHATSAPP_DISPLAY).toBe(
      `+${WHATSAPP_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4")}`,
    );
  });

  it("ships a build-time guard that fails the deploy on a placeholder number", () => {
    const script = readFileSync(resolve(ROOT, "scripts/check-whatsapp-number.mjs"), "utf-8");
    expect(script).toContain("201000000000");
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toContain("check-whatsapp-number.mjs");
  });
});
