import { describe, it, expect } from "vitest";
import {
  TOPICS,
  pillarPath,
  topicForArticle,
  topicForGuide,
  topicForProduct,
  topicsForPage,
  isPillarPath,
} from "@/data/topics";
import { articles } from "@/data/articles";
import { products } from "@/data/products";
import { seoLandingPages } from "@/data/landing-pages";

/**
 * على صدق الروابط لا على الفراغ: كل مسار pillar وكل مقالة وكل منتج مذكور في
 * العُنقود لازم يكون موجودًا، والـ pillar لازم يكون داخل عنقوده.
 */
const articleSlugs = new Set(articles.map((a) => a.slug));
const productIds = new Set(products.map((p) => p.id));
const guideSlugs = new Set(seoLandingPages.map((p) => p.slug));

describe("topics model", () => {
  it("keeps unique pillar paths and a self-consistent cluster each", () => {
    expect(TOPICS.length).toBeGreaterThan(0);
    const paths = TOPICS.map(pillarPath);
    expect(new Set(paths).size).toBe(paths.length);
    for (const topic of TOPICS) {
      expect(topic.name.length).toBeGreaterThan(3);
      expect(topic.description.length).toBeGreaterThan(20);
      expect(topic.articleSlugs.length).toBeGreaterThan(0);
      // الـ pillar نفسه جزء من العنقود
      if (topic.pillarKind === "article") expect(topic.articleSlugs).toContain(topic.pillarSlug);
      else expect(topic.guideSlugs).toContain(topic.pillarSlug);
    }
  });

  it("never points to a missing article, guide or product", () => {
    for (const topic of TOPICS) {
      for (const slug of topic.articleSlugs)
        expect(articleSlugs.has(slug), `${topic.id}:${slug}`).toBe(true);
      for (const id of topic.productIds) expect(productIds.has(id), `${topic.id}:${id}`).toBe(true);
      // كل دليل مذكور لازم يكون موجودًا وغير مخفي (noindex)
      for (const slug of topic.guideSlugs)
        expect(guideSlugs.has(slug), `${topic.id}:${slug}`).toBe(true);
    }
  });

  it("resolves lookups and related topics", () => {
    expect(isPillarPath("/education/premature-ejaculation")).toBe(true);
    expect(isPillarPath("/education")).toBe(false);
    expect(isPillarPath("/products/men")).toBe(false);
    expect(topicForArticle("delay-sprays-safe-use")?.id).toBe("mens-performance");
    expect(topicForProduct("m-60")?.id).toBe("mens-performance");
    expect(topicForProduct("d-05")?.id).toBe("devices-care");
    expect(topicForGuide("vacuum-pump-buying-guide")?.id).toBe("devices-care");
    expect(topicForGuide("no-such-guide")).toBeUndefined();
    expect(topicForArticle("no-such-article")).toBeUndefined();
    expect(topicForProduct("m-99")).toBeUndefined();
    expect(topicsForPage(undefined, 2)).toHaveLength(2);
    expect(topicsForPage(topicForArticle("premature-ejaculation"), 2)[0].id).toBe(
      "mens-performance",
    );
  });
});
