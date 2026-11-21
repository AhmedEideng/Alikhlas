import { describe, expect, it } from "vitest";
import { products, getCrossSellsForProduct } from "@/data/products";
import { getBundleProductType } from "@/lib/product-form";
import bundlesDb from "../../api/lib/bundles-db.json";

/**
 * قرارات المالك (الجولة 33) مثبّتة هنا كي لا ترجع بالخطأ:
 * 1) المناديل الرجالية أو النسائية لا تظهر داخل أي عرض في صفحات المنتجات.
 * 2) عرض الجهاز = الجهاز المطلوب + منتجان رجالي، وليس أجهزة أخرى.
 * 3) لا ذكر لتخدير موضعي في أي منتج (يُفحص في product-copy-terminology.test.ts).
 *
 * الاختبار يفحص المحرك (getCrossSellsForProduct) **و** خريطة الباقات التي
 * يستخدمها الخادم لخصم الباقة (api/lib/bundles-db.json)، لأن أي انحراف بينهما
 * يعني عرضًا في الواجهة لا يقابله خصم صحيح عند الدفع.
 */

const WIPES_IDS = new Set(["m-29", "w-23"]);
const isWipes = (id: string) => {
  const product = products.find((p) => p.id === id);
  return WIPES_IDS.has(id) || (product ? getBundleProductType(product) === "wipes" : false);
};

describe("offers on product pages (round 33 owner rules)", () => {
  it("never puts men's or women's wipes inside an offer", () => {
    for (const product of products) {
      const offered = getCrossSellsForProduct(product).map((p) => p.id);
      for (const id of offered) {
        expect(isWipes(id), `${product.id} offers wipes ${id}`).toBe(false);
      }
    }
  });

  it("offers a device with two men's products, never with another device", () => {
    const devices = products.filter((p) => p.category === "devices");
    expect(devices.length).toBeGreaterThan(0);
    for (const device of devices) {
      const offered = getCrossSellsForProduct(device);
      expect(offered.length, `${device.id} must offer exactly two companions`).toBe(2);
      for (const companion of offered) {
        expect(companion.category, `${device.id} -> ${companion.id}`).toBe("men");
        expect(companion.id).not.toBe(device.id);
      }
      // نوعان مختلفان: لا جلّين ولا عسلين، وبلا مناديل.
      const types = offered.map((p) => getBundleProductType(p));
      expect(new Set(types).size).toBe(types.length);
    }
  });

  it("keeps the server bundle map identical to the engine", () => {
    for (const product of products) {
      const offered = getCrossSellsForProduct(product).map((p) => p.id);
      const stored = (bundlesDb as Record<string, string[]>)[product.id]?.slice(1) ?? [];
      expect(stored, `bundles-db.json mismatch for ${product.id}`).toEqual(offered);
      for (const id of stored) {
        expect(isWipes(id), `stored bundle for ${product.id} holds wipes`).toBe(false);
      }
    }
  });
});
