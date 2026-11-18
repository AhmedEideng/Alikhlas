import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProductCatalog } from "@/components/ProductCatalog";
import { CatalogBand } from "@/components/product/ProductHeader";
import { CategoryFAQ } from "@/components/CategoryFAQ";
import { getCategoryPage } from "@/data/category-pages";
import {
  injectJsonLd,
  clearJsonLd,
  clearPrerenderJsonLd,
  itemListSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/lib/seo";

const PAGE = getCategoryPage("women");

export const Route = createFileRoute("/products/women")({
  loader: async () => {
    const { getPublicProductsByCategory } = await import("@/data/products");
    return { items: getPublicProductsByCategory("women") };
  },
  head: () => ({
    meta: [{ title: PAGE.metaTitle }, { name: "description", content: PAGE.metaDescription }],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { items } = Route.useLoaderData();

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd(
      "itemlist",
      itemListSchema(
        items.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.image,
          price: p.price,
        })),
        PAGE.title,
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: PAGE.breadcrumbLabel, url: "/products/women" },
      ]),
    );
    injectJsonLd("faq", faqSchema(PAGE.faqs));
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <CatalogBand
        eyebrow={PAGE.eyebrow}
        title={PAGE.title}
        description={PAGE.description}
        promise={PAGE.promise}
      />

      <ProductCatalog items={items} category="women" listName="women_category" />

      <CategoryFAQ title={PAGE.faqTitle} description={PAGE.faqDescription} items={PAGE.faqs} />
    </div>
  );
}
