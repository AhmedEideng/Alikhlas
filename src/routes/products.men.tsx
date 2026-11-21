import { createFileRoute, Link } from "@tanstack/react-router";
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

const PAGE = getCategoryPage("men");

export const Route = createFileRoute("/products/men")({
  // في هذا الإصدار من TanStack Router تغيير search فقط (نفس المسار) لا
  // يعيد تشغيل الـ loader تلقائياً (match.cause يبقى "stay") — لذلك نضطره
  // صراحةً. الـ loader فلتر محلي بلا شبكة فلا يوجد تكلفة.
  shouldReload: () => true,
  // بحث URL-driven (مطابق لـ SearchAction في JSON-LD الرئيسي):
  // /products/men?q={search_term_string}
  // النوع مُعلَن صراحةً (q اختياري) حتى لا يُطلَب من كل Link في الموقع
  // تمرير search صريح.
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
  }),
  // ملاحظة: في هذا الإصدار من TanStack Router لا يوجد search في LoaderFnContext
  // والبحث يُقرأ من location.search (نوعه {} — نحقق من النوع وقت التشغيل؛
  // validateSearch أعلاه يضمن أن القيمة نص منسّق أو غائب).
  loader: async ({ location }) => {
    const { getPublicProductsByCategory, matchesProductQuery } = await import("@/data/products");
    const all = getPublicProductsByCategory("men");
    const qRaw = (location.search as Record<string, unknown>).q;
    const q = typeof qRaw === "string" ? qRaw : "";
    // فلترة موحدة تشمل المرادفات المصرية (نقط/قطرات)
    const items = q ? all.filter((p) => matchesProductQuery(p, q)) : all;
    return { items, query: typeof qRaw === "string" ? qRaw : "", total: all.length };
  },
  head: () => ({
    meta: [{ title: PAGE.metaTitle }, { name: "description", content: PAGE.metaDescription }],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { items, query, total } = Route.useLoaderData();

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
        { name: PAGE.breadcrumbLabel, url: "/products/men" },
      ]),
    );
    injectJsonLd("faq", faqSchema(PAGE.faqs));
    // GA4: view_item_list — كل عرض لقائمة منتجات الرجال
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items, query]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <CatalogBand
        eyebrow={PAGE.eyebrow}
        title={PAGE.title}
        description={PAGE.description}
        promise={PAGE.promise}
      />

      {query ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-bold">
            نتائج البحث عن: «{query}»، {items.length} من {total} منتج
          </p>
          <Link to="/products/men" className="text-sm font-bold text-primary hover:underline">
            مسح البحث
          </Link>
        </div>
      ) : null}

      {query && items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-lg font-bold">لا توجد منتجات مطابقة لبحثك «{query}»</p>
          <p className="mt-2 text-sm text-muted-foreground">جرّب كلمة أخرى أو تصفح كل المنتجات</p>
          <Link
            to="/products/men"
            className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            الباقي من منتجات الرجال
          </Link>
        </div>
      ) : (
        <ProductCatalog items={items} category="men" listName="men_category" />
      )}

      <CategoryFAQ title={PAGE.faqTitle} description={PAGE.faqDescription} items={PAGE.faqs} />
    </div>
  );
}
