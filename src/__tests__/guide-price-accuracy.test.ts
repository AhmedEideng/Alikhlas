import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { seoLandingPages } from "@/data/landing-pages";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

const FREE_SHIPPING_THRESHOLD = 2000;
const SHIPPING_FEES = new Set([50, 70, 90, 120]);
const CATALOG_PRICES = new Set(products.map((p) => p.price));

const NUM = "(?:\\d{1,3}(?:,\\d{3})+|\\d+)";
const CURRENCY = new RegExp(`${NUM}\\s*(?:ج\\.م|جنيه|جنية)`, "g");

function guideTexts(): { slug: string; text: string }[] {
  return seoLandingPages.map((page) => ({
    slug: page.slug,
    text: JSON.stringify(page),
  }));
}

describe("hand-written prices in SEO guides", () => {
  it("never quotes an amount that matches no catalog price, shipping fee or free-shipping threshold", () => {
    const offenders: string[] = [];
    for (const { slug, text } of guideTexts()) {
      for (const match of text.matchAll(CURRENCY)) {
        const amount = Number(match[0].replace(/[^\d]/g, "").replace(/,/g, ""));
        if (!Number.isFinite(amount)) continue;
        if (amount < 100) continue;
        const allowed =
          CATALOG_PRICES.has(amount) ||
          amount === FREE_SHIPPING_THRESHOLD ||
          SHIPPING_FEES.has(amount);
        if (!allowed) offenders.push(`${slug}: ${match[0]}`);
      }
    }
    expect(offenders, `أسعار بلا أصل في الكتالوج:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("keeps the storefront on a valid Egyptian WhatsApp number format", () => {
    expect(WHATSAPP_NUMBER.replace(/\D/g, "")).toMatch(/^20\d{10}$/);
  });
});
