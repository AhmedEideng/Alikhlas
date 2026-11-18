import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { products } from "@/data/products";
import { getArchivedReviewSummary, VISIBLE_REVIEW_COUNT } from "@/lib/legacy-product-reviews";
import { productSchema } from "@/lib/seo";
import { LegacyProductReviews } from "@/features/product/components/LegacyProductReviews";

describe("review summary is a single source (schema + UI)", () => {
  it("omits aggregateRating and review schema when archive is empty", () => {
    for (const product of products) {
      expect(getArchivedReviewSummary(product.slug)).toBeNull();
      const schema = productSchema({ ...product }) as {
        aggregateRating?: unknown;
        review?: unknown;
      };
      expect(schema.aggregateRating, product.slug).toBeUndefined();
      expect(schema.review, product.slug).toBeUndefined();
    }
  });

  it("renders nothing when a product has no archived reviews", () => {
    const product = products[0];
    const { container } = render(
      <LegacyProductReviews
        rating={product.rating ?? 0}
        reviewsCount={product.reviews ?? 0}
        category={product.category}
        slug={product.slug}
        maxVisibleReviews={VISIBLE_REVIEW_COUNT}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
