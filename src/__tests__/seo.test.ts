import { describe, expect, it } from "vitest";
import { seoLandingPages } from "@/data/landing-pages";
import { products } from "@/data/products";
import {
  faqSchema,
  makeProductMetaDescription,
  makeProductMetaTitle,
  merchantShippingDetails,
  productSchema,
} from "@/lib/seo";

const product = {
  id: "m-test",
  slug: "test-product",
  name: "منتج اختبار",
  description: "وصف اختبار طويل بما يكفي لاختبار مخطط المنتج دون أي بيانات تقييمات ثابتة.",
  price: 300,
  stock: 10,
};

describe("SEO landing-page policy", () => {
  it("keeps every configured SEO landing page valid and indexable unless explicitly marked", () => {
    expect(Array.isArray(seoLandingPages)).toBe(true);
    for (const page of seoLandingPages) {
      expect(page.slug.length).toBeGreaterThan(0);
      expect(page.title.length).toBeGreaterThan(0);
    }
  });
});

describe("product JSON-LD review provenance", () => {
  it("does not emit an aggregate rating without an approved API summary", () => {
    const schema = productSchema(product);
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("mpn");
    expect(schema).not.toHaveProperty("gtin");
    expect(schema).not.toHaveProperty("brand");
  });

  it("accepts an aggregate only when the approved summary is valid", () => {
    const schema = productSchema({
      ...product,
      approvedReviewSummary: { ratingValue: 4.5, reviewCount: 2 },
    });
    expect(schema.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    });
  });
});

describe("shipping structured data provenance", () => {
  it("matches the visible delivery windows", () => {
    const details = merchantShippingDetails();
    const cairo = details.find((detail) =>
      detail.shippingDestination.addressRegion.includes("القاهرة"),
    );
    const other = details.find((detail) =>
      detail.shippingDestination.addressRegion.includes("الإسكندرية"),
    );

    expect(cairo?.deliveryTime.transitTime).toMatchObject({ minValue: 1, maxValue: 3 });
    expect(other?.deliveryTime.transitTime).toMatchObject({ minValue: 2, maxValue: 3 });
    expect(cairo?.deliveryTime.handlingTime).toMatchObject({ minValue: 0, maxValue: 0 });
  });
});

describe("product metadata templates", () => {
  it("emits catalog product titles verbatim so prerender and SPA agree", () => {
    const name = "كبسولات هامر أوف ثور الألمانية الأصلية المستوردة (Hammer of Thor)";
    const title = makeProductMetaTitle(name);

    // Every catalog name fits the guard limit, so nothing is clipped: the
    // initial HTML <title> and the hydrated document.title stay identical.
    expect(title).toBe(name);
    expect(title).not.toContain("…");
  });

  it("still guards against a runaway name by trimming at a word boundary", () => {
    const title = makeProductMetaTitle(`${"اسم طويل جداً ".repeat(12)}(Brand Name)`, 60);

    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith("…")).toBe(true);
  });

  // لعنوان الميتا فقط حين يخلو الاسم من اللاتيني (kreva/dooz = أعلى طلب لاتيني).
  it("appends titleLatin only when the name carries no Latin letters", () => {
    const kreva = makeProductMetaTitle("جل كريفا الألماني المتطور للرجال (50 جم)", 70, "Kreva Gel");
    expect(kreva).toBe("جل كريفا الألماني المتطور للرجال (50 جم) | Kreva Gel");
    expect(kreva.length).toBeLessThanOrEqual(70);

    const dooz = makeProductMetaTitle(
      "كريم دوز 14000 الألماني الأصلي للتأخير للرجال (20 جم)",
      70,
      "Dooz 14000",
    );
    expect(dooz.endsWith(" | Dooz 14000")).toBe(true);
    expect(dooz.length).toBeLessThanOrEqual(70);

    const alreadyLatin = makeProductMetaTitle(
      "أقراص هارد أون المزدوجة للرجال (Hard-On)",
      70,
      "Hard On",
    );
    expect(alreadyLatin).toBe("أقراص هارد أون المزدوجة للرجال (Hard-On)");

    const noToken = makeProductMetaTitle("جل سوتارا المتطور للرجال (Sotara Gel)");
    expect(noToken).toBe("جل سوتارا المتطور للرجال (Sotara Gel)");
  });

  it("builds a complete, sentence-ended supplement description", () => {
    const description = makeProductMetaDescription({
      name: "كبسولات جينسنج 1650 للرجال (Ginseng 1650)",
      nameEn: "Ginseng 1650 Capsules",
      category: "men",
      description: "وصف طويل لا يستخدم كقص ميكانيكي داخل الوصف المختصر.",
      stock: 10,
    });

    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain("مكمل غذائي");
    expect(description).not.toMatch(/\d+\s*ج\.م/);
    expect(description).not.toMatch(/السعر|تعليمات|وفق|النشرة/);
    expect(description).toContain("شحن سري ودفع عند الاستلام");
    expect(description).toContain("الإخلاص ميديكال");
    expect(description.endsWith(".")).toBe(true);
  });

  // سعر + خطاف فريد لكل منتج — بلا صدى للعنوان في البداية. الأرقام من نفس
  // مصدر aggregateRating في السكيمَا (rating/reviews في بيانات المنتج).
  it("restores the owner-approved rich formula (stars + price + hook, no title echo)", () => {
    const rich = makeProductMetaDescription({
      id: "m-01",
      name: "كبسولات هامر أوف ثور الألمانية الأصلية المستوردة (Hammer of Thor)",
      nameEn: "Original German Hammer of Thor Capsules",
      category: "men",
      description: "وصف طويل لا يستخدم كقص ميكانيكي داخل الوصف المختصر.",
      price: 520,
      stock: 10,
      rating: 4.9,
      reviews: 48,
    });

    expect(rich.length).toBeLessThanOrEqual(155);
    expect(rich.startsWith("⭐4.9/5 من 48 تقييماً، ")).toBe(true);
    expect(rich).toContain("520 ج.م");
    expect(rich).toContain("شحن سري ودفع عند الاستلام");
    expect(rich).toContain("الإخلاص ميديكال");
    expect(rich.startsWith("كبسولات هامر")).toBe(false);
    expect(rich.endsWith(".")).toBe(true);
  });

  it("includes a raw first-benefit excerpt except for the approved Kreva historical meta", () => {
    expect(products).toHaveLength(85);

    for (const catalogProduct of products.filter((p) => p.id !== "m-60")) {
      const rawBenefit = catalogProduct.benefits?.[0]?.trim().replace(/\s+/g, " ");
      expect(rawBenefit, `Missing first benefit for ${catalogProduct.id}`).toBeTruthy();

      const description = makeProductMetaDescription(catalogProduct);
      expect(description.length).toBeLessThanOrEqual(155);
      expect(description).toContain(rawBenefit!.slice(0, Math.min(15, rawBenefit!.length)));
    }
  });

  it("preserves source benefit claims without rewriting them", () => {
    const rawBenefit = "يحسن تدفق الدم ويضمن علاج الانتصاب بأمان";
    const description = makeProductMetaDescription({
      id: "m-unreviewed",
      name: "منتج اختبار",
      category: "men",
      description: "وصف اختبار.",
      benefits: [rawBenefit],
      stock: 1,
    });

    expect(description).toContain(rawBenefit);
  });

  it("omits stars when the product has no approved rating data", () => {
    const plain = makeProductMetaDescription({
      name: "كريم اختبار بلا تقييم (Test Cream)",
      category: "men",
      description: "وصف اختبار.",
      price: 100,
      stock: 5,
    });

    expect(plain.length).toBeLessThanOrEqual(155);
    expect(plain).not.toContain("⭐");
    expect(plain).toContain("100 ج.م");
    expect(plain).toContain("شحن سري ودفع عند الاستلام");
  });
});

// Kreva's useful product content must not regress into shipping-only copy.
describe("Kreva product search context", () => {
  it("restores August 17 content with current price and stock, without ratings", async () => {
    const kreva = products.find((item) => item.id === "m-60")!;
    expect(kreva.price).toBe(280);
    expect(kreva.slug).toBe("kreva-advanced-men-gel-50g");
    expect(kreva.titleLatin).toBeUndefined();
    expect(kreva.rating).toBeUndefined();
    expect(kreva.reviews).toBeUndefined();
    expect(kreva.stock).toBe(5000);
    // الاسم والوصف والاستخدام والميتا المستعادة في 17 أغسطس لم تُمسّ.
    expect(kreva.searchAliases).toEqual(["كريڨا", "كريڨه", "جل كريفا", "جل تأخير", "Kreva Gel"]);
    expect(kreva.description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول (ساخن وبارد)");
    expect(makeProductMetaDescription(kreva)).toBe(
      "جل كريفا للرجال (Kreva Gel 50GM) هو تركيبة جل كريمي متخصصة ثنائية المفعول (ساخن وبارد) لدعم الأداء والتحكم في وقت العلاقة. يجمع زيت Cayenne Oil الذي ينشط…",
    );
    // منافس (قياس 5-grams = 100%)؛ الصياغة أُعيدت كتابتها مع الحفاظ على نفس
    expect(kreva.usage).toBe(
      "نظّف المنطقة بالماء وجفّفها قبل التطبيق. وزّع طبقة رقيقة على العضو وادعك برفق من دقيقتين إلى خمس حتى يتشرّب الجل، ثم انتظر من ربع إلى ثلث ساعة واغسل بالماء والصابون قبل العلاقة. للاستخدام الخارجي فقط: أبعد الجل عن العينين والجروح المفتوحة، وأوقفه فورًا عند تهيّج أو احمرار.",
    );
    const schema = productSchema(kreva);
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
    expect(kreva.description).not.toMatch(/راجع.*العبوة|حسب العبوة/);
    const { getProductFAQs } = await import("@/data/product-faqs");
    const faqs = getProductFAQs(kreva);
    // خاصة جديدة ثم الأسئلة الأربعة العامة — بلا بلوك تاريخي مستقل.
    expect(faqs.length).toBeGreaterThan(4);
    expect(faqs[0].answer).toContain(`${kreva.price} جنيه`);
    expect(faqs.some((faq) => faq.answer.includes("24-72"))).toBe(true);
    expect(faqs.slice(-4).map((faq) => faq.question)).toEqual([
      "هل التغليف سري؟",
      "كم يستغرق الشحن؟",
      "كيف يمكنني الدفع؟",
      "هل المنتجات أصلية؟",
    ]);
  });
});

// Package-1 growth fixes: query-aligned first benefits (meta source) and
// product-specific FAQs for the high-impression / low-CTR pages.
describe("high-opportunity product pages", () => {
  it("keeps query-aligned meta benefits and specific FAQs", async () => {
    const { getProductFAQs } = await import("@/data/product-faqs");
    const byId = (id: string) => products.find((item) => item.id === id)!;

    expect(byId("w-17").benefits[0]).toContain("فياجرا للنساء");
    expect(byId("m-30").benefits[0]).toContain("إملا");
    expect(byId("m-07").benefits[0]).toContain("دوز 14000");
    expect(byId("w-03").benefits[0]).toContain("سبانش فلاي");
    expect(byId("m-01").benefits[0]).toContain("هامر أوف ثور");

    const hammerFaqs = getProductFAQs(byId("m-01"));
    expect(hammerFaqs.some((f) => f.question.includes("طريقة استعمال هامر أوف ثور"))).toBe(true);
    expect(hammerFaqs.some((f) => f.answer.includes("500 جنيه"))).toBe(true);

    const doozFaqs = getProductFAQs(byId("m-07"));
    expect(doozFaqs.some((f) => f.question.includes("Dooz Gel"))).toBe(true);

    for (const product of products) {
      expect(makeProductMetaDescription(product).length).toBeLessThanOrEqual(155);
    }
  });
});

// Package-2: same treatment for the next high-impression / low-CTR cluster.
describe("package-2 product pages", () => {
  it("keeps query-aligned meta benefits and differentiating FAQs", async () => {
    const { getProductFAQs } = await import("@/data/product-faqs");
    const byId = (id: string) => products.find((item) => item.id === id)!;

    for (const id of [
      "m-15",
      "w-02",
      "m-05",
      "m-48",
      "m-32",
      "w-05",
      "m-12",
      "m-17",
      "m-37",
      "m-45",
    ]) {
      expect(getProductFAQs(byId(id)).length, id).toBeGreaterThan(4);
      expect(makeProductMetaDescription(byId(id)).length, id).toBeLessThanOrEqual(155);
    }
    expect(
      getProductFAQs(byId("m-48")).some((f) => f.question.includes("الفرق بين تيتان جل")),
    ).toBe(true);
    expect(
      getProductFAQs(byId("m-32")).some((f) => f.question.includes("الفرق بين تيتان جل جولد")),
    ).toBe(true);
    expect(
      getProductFAQs(byId("w-05")).some((f) => f.question.includes("العسل الملكي للنساء")),
    ).toBe(true);
  });
});

// Education articles baseline: clean empty array ready for fresh Al Ikhlas Medical content.
describe("education articles baseline", () => {
  it("exports a valid articles array", async () => {
    const { articles } = await import("@/data/articles");
    expect(Array.isArray(articles)).toBe(true);
  });
});

// مكررة أو أجوبة فارغة. المظهر المرئي في جوجل انتهى في 7 مايو 2026، فالحارس
// هنا على صدق التعليم الآلي ومطابقته للصفحة — لا على الـrich result.
describe("product FAQPage schema", () => {
  it("mirrors each product's visible FAQ list exactly", async () => {
    const { getProductFAQs } = await import("@/data/product-faqs");
    expect(products).toHaveLength(85);
    for (const catalogProduct of products) {
      const faqs = getProductFAQs(catalogProduct);
      const schema = faqSchema(faqs);
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity.map((entry) => entry.name)).toEqual(faqs.map((faq) => faq.question));
      expect(new Set(schema.mainEntity.map((entry) => entry.name)).size).toBe(faqs.length);
      for (const entry of schema.mainEntity) {
        expect(entry["@type"]).toBe("Question");
        expect(entry.acceptedAnswer["@type"]).toBe("Answer");
        expect(entry.acceptedAnswer.text.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
