import { describe, expect, it } from "vitest";
import {
  products,
  getFeaturedProducts,
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
} from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { makeProductMetaDescription } from "@/lib/seo";

describe("homepage device selection and manual pump price", () => {
  it("shows the three requested devices and only real catalog devices", () => {
    const featured = new Set(getFeaturedProducts().map((p) => p.id));
    const selected = HOMEPAGE_CONCERN_CANDIDATES.devices
      .filter((id) => !featured.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
      .slice(0, 3);
    expect(selected).toEqual(["d-05", "d-07", "d-08"]);
    // الصفحة الرئيسية وكل معرف في الكتالوج لازم يشير لمنتج موجود فعلاً، وأي
    // منتج محذوف لا يظهر في أي قائمة أو قسم.
    const deviceIds = new Set(products.filter((p) => p.category === "devices").map((p) => p.id));
    expect(deviceIds.size).toBe(6);
    for (const id of HOMEPAGE_CONCERN_CANDIDATES.devices)
      expect(deviceIds.has(id), `قسم الأجهزة يشير إلى منتج غير موجود: ${id}`).toBe(true);
  });
  it("keeps the manual pump price consistent in data, copy, FAQ and meta", () => {
    const pump = products.find((p) => p.id === "d-05")!;
    expect(pump.price).toBe(800);
    // والمصدر الوحيد للحقيقة هو حقل price (اللي بيُعرض حيًّا في الصفحة).
    expect(pump.description).not.toMatch(/جنيه|ج\.م|EGP/);
    expect(pump.description).not.toMatch(/750|٧٥٠/);
    expect(getProductFAQs(pump).some((f) => f.answer.includes("800 جنيه"))).toBe(true);
    expect(makeProductMetaDescription(pump)).toContain("800 ج.م");
    expect(pump.stock).toBe(5000);
  });
});

describe("owner-selected homepage concern sections", () => {
  it.each([
    ["delay", ["m-31", "m-55", "m-30"]],
    ["strength", ["m-04", "m-63", "m-03"]],
    ["women", ["w-25", "w-10", "w-15"]],
  ] as const)("keeps the exact requested %s products in order", (key, expected) => {
    const featured = new Set(getFeaturedProducts().map((p) => p.id));
    const actual = HOMEPAGE_CONCERN_CANDIDATES[key]
      .filter((id) => !featured.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
      .slice(0, 3);
    expect(actual).toEqual(expected);
    for (const id of actual) expect(products.some((p) => p.id === id)).toBe(true);
  });
  it("moves Connubial out of featured and enables capsules without enabling tablets", () => {
    const featured = getFeaturedProducts().map((p) => p.id);
    expect(featured).toHaveLength(6);
    expect(featured).not.toContain("w-15");
    expect(featured).toContain("m-32");
    expect(HOMEPAGE_EXCLUDED_PRODUCT_IDS.has("m-03")).toBe(false);
    expect(HOMEPAGE_EXCLUDED_PRODUCT_IDS.has("m-49")).toBe(true);
    const concernIds = Object.values(HOMEPAGE_CONCERN_CANDIDATES).flatMap((ids) =>
      ids
        .filter((id) => !featured.includes(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3),
    );
    expect(new Set([...featured, ...concernIds]).size).toBe(18);
  });
});
