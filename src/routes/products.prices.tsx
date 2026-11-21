import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, BadgeCheck, Truck, Wallet } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { PRICE_PAGE, priceFaqs } from "@/data/price-page-copy";
import { formatPrice } from "@/data/product-types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/site-config";
import {
  absoluteUrl,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  faqSchema,
  injectJsonLd,
} from "@/lib/seo";

export const Route = createFileRoute("/products/prices")({
  head: () => ({
    meta: [
      { title: PRICE_PAGE.metaTitle },
      { name: "description", content: PRICE_PAGE.metaDescription },
    ],
  }),
  // الكتالوج الكامل (~45KB) لا يعود إلى الحزمة الأولى: صفوف الأسعار تُحمَّل
  // هنا فقط عند فتح الصفحة، مثل مسارات الأقسام تمامًا.
  loader: async () => {
    const { priceGroups, priceRange } = await import("@/data/price-list");
    return { priceGroups, priceRange };
  },
  component: PricesPage,
});

function PricesPage() {
  const { priceGroups, priceRange } = Route.useLoaderData();

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd("prices-collection", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": absoluteUrl(PRICE_PAGE.path),
      name: PRICE_PAGE.title,
      description: PRICE_PAGE.metaDescription,
      inLanguage: "ar-EG",
      url: absoluteUrl(PRICE_PAGE.path),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: priceRange.count,
        itemListElement: priceGroups.flatMap((group) =>
          group.rows.map((row) => ({
            "@type": "ListItem",
            url: absoluteUrl(`/products/${row.slug}`),
            name: row.name,
          })),
        ),
      },
    });
    injectJsonLd("prices-faq", faqSchema(priceFaqs));
    injectJsonLd(
      "prices-breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "المنتجات", url: "/products/men" },
        { name: "الأسعار", url: PRICE_PAGE.path },
      ]),
    );
    return () => {
      clearJsonLd("prices-collection");
      clearJsonLd("prices-faq");
      clearJsonLd("prices-breadcrumb");
    };
  }, [priceGroups, priceRange]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <PageHero
        eyebrow="شفافية الأسعار"
        title={PRICE_PAGE.title}
        description="كل الأسعار في جدول واحد، من الأرخص للأعلى، بنفس الأرقام الموجودة في صفحات المنتجات، بلا «تواصل معنا للسعر» وبلا سعر يتغيّر بعد الطلب."
      />

      <nav aria-label="مسار التنقل" className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          الرئيسية
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="font-bold text-foreground">الأسعار</span>
      </nav>

      <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e8c473]/70 bg-[linear-gradient(135deg,#fffaef,#ffffff)] p-4">
          <p className="text-xs font-bold text-[#8f6508]">عدد المنتجات في الجدول</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[#0b3b26]">{priceRange.count}</p>
        </div>
        <div className="rounded-2xl border border-[#e8c473]/70 bg-[linear-gradient(135deg,#fffaef,#ffffff)] p-4">
          <p className="text-xs font-bold text-[#8f6508]">نطاق الأسعار</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#0b3b26]">
            من {priceRange.minLabel}
            <span className="mx-1 text-sm font-bold text-[#8f6508]">إلى</span>
            {priceRange.maxLabel}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-[#e8c473]/70 bg-[linear-gradient(135deg,#fffaef,#ffffff)] p-4 sm:col-span-1">
          <p className="text-xs font-bold text-[#8f6508]">الشحن المجاني</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[#0b3b26]">
            من {formatPrice(FREE_SHIPPING_THRESHOLD)}
          </p>
        </div>
      </section>

      {priceGroups.map((group) => (
        <section key={group.key} className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black text-[#0b3b26] md:text-2xl">
              {group.label}
              <span className="ms-2 text-sm font-bold text-muted-foreground tabular-nums">
                ({group.rows.length})
              </span>
            </h2>
            <Link
              to={group.href}
              className="inline-flex items-center gap-1.5 text-sm font-black text-primary hover:underline"
            >
              القسم كاملًا
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#f7ebc4] bg-white">
            <table className="w-full border-collapse text-start text-sm">
              <caption className="sr-only">أسعار {group.label} مرتبة من الأرخص إلى الأعلى</caption>
              <thead>
                <tr className="bg-[#fff9ee] text-[12px] text-[#7a6a4c]">
                  <th scope="col" className="px-3 py-2.5 text-start font-black">
                    المنتج
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-2.5 text-start font-black sm:table-cell"
                  >
                    الشكل
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-start font-black">
                    السعر
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-t border-[#f2ead2] ${index % 2 === 1 ? "bg-[#fffdf8]" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        to="/products/$slug"
                        params={{ slug: row.slug }}
                        className="font-bold text-[#0b3b26] hover:text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-[12px] text-muted-foreground sm:table-cell">
                      {row.family}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-black tabular-nums text-[#8f6508]">
                      {row.priceLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mb-8 rounded-[1.5rem] border bg-card p-5 md:p-7">
        <h2 className="mb-3 text-xl font-black md:text-2xl">قبل أن تقارن السعر</h2>
        <ul className="grid gap-2.5 text-sm leading-7 text-foreground/90 md:text-base">
          <li className="flex items-start gap-2">
            <BadgeCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
            السعر وحده لا يقول شيئًا عن المناسبة: اقرأ المكوّن وعدد الأيام التي تكفيها العبوة في
            صفحة المنتج.
          </li>
          <li className="flex items-start gap-2">
            <Truck className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
            الشحن يُحسب حسب المحافظة ويظهر في السلة قبل التأكيد، والشحن مجاني من{" "}
            {formatPrice(FREE_SHIPPING_THRESHOLD)} فأكثر.
          </li>
          <li className="flex items-start gap-2">
            <Wallet className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
            الدفع عند الاستلام، والعبوة تخرج محايدة بلا اسم منتج أو وصف على ظهرها.
          </li>
        </ul>
      </section>

      <section className="rounded-[1.5rem] border bg-card p-5 md:p-7">
        <h2 className="mb-4 text-xl font-black md:text-2xl">أسئلة عن الأسعار والدفع</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {priceFaqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border bg-[#fffdf8] p-4">
              <h3 className="mb-1.5 text-sm font-black text-[#0b3b26]">{faq.question}</h3>
              <p className="text-[13px] leading-7 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
