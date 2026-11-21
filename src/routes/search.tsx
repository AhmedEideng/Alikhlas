import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useEffect } from "react";
import { suggestProductSearch } from "@/lib/product-search";
import { trackSiteSearch, trackViewItemList } from "@/lib/analytics";

const PAGE_TITLE = "نتائج البحث";

/**
 * صفحة نتائج البحث الشاملة: /search?q={search_term_string}
 * - الهدف المُعلَن في SearchAction بـ JSON-LD الرئيسي (صفحة الرئيسية) وفي
 *   قالب البحث في الـ sitemap — أي أن نتائج بحث جوجل/Google Shopping
 *   تصل العميل هنا مباشرة.
 * - noindex (noindex,follow): صفحات نتائج البحث لا تُفهرس (محتوى مكرر
 *   عن صفحات المنتجات نفسها) لكن الروابط داخلها تُزحف.
 * - الفلتر محلي حتمي (searchAllPublicProducts) — نفس نمط ?q في
 *   صفحات الفئات، بدون شبكة، قابل للاختبار.
 */
export const Route = createFileRoute("/search")({
  // في هذا الإصدار من TanStack Router تغيير search فقط (نفس المسار) لا
  // يعيد تشغيل الـ loader تلقائياً (match.cause يبقى "stay") — لذلك نضطره
  // صراحةً. الـ loader فلتر محلي بلا شبكة فلا يوجد تكلفة.
  shouldReload: () => true,
  // q اختياري: /search بدون كلمة يعرض كل المنتجات (نقطة انطلاق).
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
  }),
  // ملاحظة: في هذا الإصدار من TanStack Router لا يوجد search في LoaderFnContext
  // والبحث يُقرأ من location.search (نوعه {} — نحقق من النوع وقت التشغيل؛
  // validateSearch أعلاه يضمن أن القيمة نص منسّق أو غائب).
  loader: async ({ location }) => {
    const { searchAllPublicProducts, products } = await import("@/data/products");
    const qRaw = (location.search as Record<string, unknown>).q;
    const q = typeof qRaw === "string" ? qRaw : "";
    const items = searchAllPublicProducts(q);
    return {
      items,
      suggestions: items.length === 0 ? suggestProductSearch(products, q) : [],
      query: typeof qRaw === "string" ? qRaw.trim() : "",
      total: products.length,
    };
  },
  head: () => ({
    meta: [
      { title: `${PAGE_TITLE}، الإخلاص ميديكال` },
      // noindex,follow — مثل باقي صفحات النتائج/العربة: لا فهرسة لكن الروابط تُزحف.
      { name: "robots", content: "noindex,follow" },
      {
        name: "description",
        content:
          "نتائج البحث في منتجات الإخلاص ميديكال | كل المنتجات رجالي ونساء وأجهزة في مكان واحد، بالاسم العربي أو الإنجليزي.",
      },
    ],
  }),
  component: SearchResultsPage,
});

function SearchResultsPage() {
  const { items, query, total, suggestions } = Route.useLoaderData();

  useEffect(() => {
    if (query && query.trim()) {
      trackSiteSearch(query.trim(), items.length);
    }
    if (items.length > 0) {
      trackViewItemList(
        query ? "search_results" : "search_all",
        items.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
  }, [query, items]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* (2026-11-16) رأس مضغوط بالهوية: كان عنوانًا أبيض + شريط ملخص مكرر
          يعيد نفس العنوان مرة ثانية — الشريط اتشال والملخص اندمج في الرأس. */}
      <section className="relative mb-6 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(118deg,#032a17_0%,#064e2b_58%,#0b6b3a_100%)] px-5 py-5 text-white">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#e3ac21_20%,#ffd977_50%,#e3ac21_80%,transparent)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:radial-gradient(rgba(212,160,23,0.35)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e3ac21]/45 bg-[#e3ac21]/12 px-3 py-1 text-[10.5px] font-black text-[#ffd977]">
              <Search className="size-3.5" aria-hidden />
              {query ? `${items.length} من ${total} منتج` : "كل المنتجات"}
            </span>
            <h1 className="mt-2 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl md:text-[1.8rem]">
              {query ? `نتائج البحث عن: «${query}»` : "البحث في المنتجات"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[12px] leading-6 text-white/70 sm:text-sm">
              {query
                ? "من كل الأقسام: رجالي، نساء، وأجهزة، الأسعار محدَّثة لحظيًا."
                : "اكتب كلمة في صندوق البحث بالأعلى أو تصفح كل المنتجات، نبحث في الاسم العربي والإنجليزي والوصف والمكونات."}
            </p>
          </div>
          {query ? (
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.08] px-4 py-2 text-[11.5px] font-black text-white transition-colors hover:border-[#e3ac21]/60 hover:text-[#ffd977]"
            >
              مسح البحث
            </Link>
          ) : null}
        </div>
      </section>

      {query && items.length === 0 ? (
        <div className="py-10 text-center">
          <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-bold">لا توجد منتجات مطابقة لبحثك «{query}»</p>
          <p className="mt-2 text-sm text-muted-foreground">
            جرّب كلمة أقصر أو اسأل فريقنا عبر واتساب، نساعدك في اختيار الأنسب بسرية تامة.
          </p>
          {suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p>هل تقصد أحد هذه الأسماء؟</p>
              {suggestions.map((p) => (
                <Link
                  key={p.id}
                  to="/search"
                  search={{ q: p.name }}
                  className="block text-primary underline"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products/men"
              className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              منتجات رجالي
            </Link>
            <Link
              to="/products/women"
              className="rounded-full border bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              منتجات نساء
            </Link>
            <Link
              to="/products/devices"
              className="rounded-full border px-6 py-3 text-sm font-bold"
            >
              الأجهزة
            </Link>
          </div>
          <Link to="/" className="mt-6 inline-block text-sm font-bold text-primary hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <>
          <div data-search-results className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p, index) => (
              <ProductCard
                key={p.id}
                product={p}
                priority={index < 4}
                listName={query ? "search_results" : "search_all"}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
