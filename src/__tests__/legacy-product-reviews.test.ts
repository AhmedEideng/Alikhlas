import { products } from "@/data/products";
import { describe, expect, it } from "vitest";
import {
  getProductReviews,
  getArchivedReviewSummary,
  reviewDatePublished,
} from "@/lib/legacy-product-reviews";

describe("archived customer reviews (clean Al Ikhlas Medical baseline)", () => {
  it.each([
    "hammer-of-thor-men-capsules",
    "kreva-advanced-men-gel-50g",
    "dooz-14000-delay-cream-20g",
    "unknown-product",
  ])("never borrows or invents reviews for %s", (slug) => {
    expect(getProductReviews(slug, "men", 6)).toEqual({ reviews: [], rating: 0, reviewCount: 0 });
    expect(getArchivedReviewSummary(slug)).toBeNull();
  });

  it("ensures zero legacy ratings/reviews on all fresh catalog products", () => {
    for (const product of products) {
      expect(getArchivedReviewSummary(product.slug)).toBeNull();
      expect(product).not.toHaveProperty("rating");
      expect(product).not.toHaveProperty("reviews");
    }
  });
});

describe("reviewDatePublished، ISO 8601 للـ schema فقط", () => {
  it("يحوّل DD/MM/YYYY إلى ISO", () => {
    expect(
      reviewDatePublished({
        id: 1,
        name: "خ",
        text: "نص",
        rating: 5,
        date: "03/02/2026",
        helpful: 0,
        fixedDate: true,
      }),
    ).toBe("2026-02-03");
  });
  it("يمرر ISO كما هو", () => {
    expect(
      reviewDatePublished({
        id: 1,
        name: "خ",
        text: "نص",
        rating: 5,
        date: "2026-09-02",
        helpful: 0,
        fixedDate: true,
      }),
    ).toBe("2026-09-02");
  });
  it("يرفض التواريخ النسبية وكل صيغة غير مدعومة", () => {
    expect(
      reviewDatePublished({
        id: 1,
        name: "خ",
        text: "نص",
        rating: 5,
        date: "منذ يومين",
        helpful: 0,
      }),
    ).toBeNull();
    expect(
      reviewDatePublished({
        id: 1,
        name: "خ",
        text: "نص",
        rating: 5,
        date: "02-2026-03",
        helpful: 0,
        fixedDate: true,
      }),
    ).toBeNull();
  });
});
