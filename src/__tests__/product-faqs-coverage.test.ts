import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";

/**
 * الأربعة العامة (التغليف والشحن والدفع والأصالة)، وأسعاره الحقيقية تظهر في
 * أحد أجوبتها لأن السعر يُقرأ من حقل `price` وقت العرض لا يُكتب بخط اليد.
 *
 * الحرّاس هنا على التغطية والصدق لا على الصياغة:
 *   • كل صفحة منتج تعرض أكثر من الأسئلة العامة وحدها.
 *   • سؤال واحد على الأقل يحمل سعر المنتج الحالي.
 *   • لا سؤال مكرر داخل الصفحة، ولا جواب قصير أو فارغ.
 */
describe("per-product FAQ coverage", () => {
  it("gives every catalog product its own FAQ block", () => {
    for (const product of products) {
      expect(getProductFAQs(product).length, product.id).toBeGreaterThan(4);
    }
  });

  it("mirrors the live price and keeps answers readable", () => {
    for (const product of products) {
      const faqs = getProductFAQs(product);
      expect(
        faqs.some((faq) => faq.answer.includes(`${product.price} جنيه`)),
        `${product.id} price`,
      ).toBe(true);
      for (const faq of faqs) {
        expect(faq.question.trim().length, `${product.id} q`).toBeGreaterThan(7);
        expect(faq.answer.trim().length, `${product.id} a`).toBeGreaterThan(39);
      }
      expect(new Set(faqs.map((f) => f.question)).size, product.id).toBe(faqs.length);
    }
  });
});
