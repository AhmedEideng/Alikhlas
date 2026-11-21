import { useEffect } from "react";
import { Languages } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";
import { EnEditorial } from "@/components/EnEditorial";
import { CategoryFAQ } from "@/components/CategoryFAQ";
import {
  applyHreflang,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  faqSchema,
  injectJsonLd,
  itemListSchema,
} from "@/lib/seo";
import { alternatesFor, type EnCategoryPage as EnCategoryCopy } from "@/data/en-pages";
import type { Product } from "@/data/product-types";

/**
 * (en-pages.ts) + قوائم الكتالوج بـ nameEn. الروابط الداخلية تشير لصفحات
 * المنتجات العربية الحالية حتى تُنشأ صفحات المنتجات الإنجليزية.
 * الـ JSON-LD هنا مطابق حرفياً لما يحقنه الـ prerender (تكافؤ).
 */
export function EnCategoryPage({ page, items }: { page: EnCategoryCopy; items: Product[] }) {
  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd(
      "itemlist",
      itemListSchema(
        items.map((p) => ({
          id: p.id,
          name: p.nameEn,
          slug: p.slug,
          image: p.image,
          price: p.price,
        })),
        page.heroTitle,
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "Home", url: "/en" },
        { name: page.heroTitle, url: page.path },
      ]),
    );
    injectJsonLd("faq", faqSchema(page.faqs));
    applyHreflang(alternatesFor(page.path));
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items, page]);

  return (
    // وإلا ورثت العناوين محاذاة اليمين وظهرت قائمة المنتجات في وسط البطاقة.
    <div dir="ltr" lang="en" className="container mx-auto px-4 py-6 text-left md:py-8">
      <PageHero eyebrow={page.eyebrow} title={page.heroTitle} description={page.heroDescription} />
      <p className="mb-6">
        <Link
          to={page.arPath}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-[12.5px] font-black text-primary transition-colors hover:border-[#e3ac21]/60 hover:bg-[#fffaef]"
        >
          <Languages className="h-3.5 w-3.5" aria-hidden />
          View this page in Arabic: عرض هذه الصفحة بالعربية
        </Link>
      </p>

      <h2 className="mb-1 text-2xl font-extrabold text-[#0b3b26]">{page.listLabel}</h2>
      <p className="mb-4 text-[13px] text-[#3c4a44]">
        {items.length} products · prices in Egyptian pounds · open a product page for ingredients,
        usage and warnings.
      </p>
      <ul className="grid gap-x-10 sm:grid-cols-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-primary/12 py-2.5"
          >
            <Link
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="text-[13.5px] font-semibold leading-6 text-[#0b3b26] transition-colors hover:text-primary hover:underline"
            >
              {p.nameEn}
            </Link>
            <span className="shrink-0 text-[12.5px] font-black text-[#8f6508]">EGP {p.price}</span>
          </li>
        ))}
      </ul>

      <EnEditorial
        title={`Before you order: a short guide to ${page.heroTitle}`}
        sections={page.guide}
      />

      <div className="mt-10">
        <CategoryFAQ
          title={`Frequently asked questions about ${page.heroTitle}`}
          description="Answers to the most important questions before choosing a product."
          items={page.faqs}
        />
      </div>
    </div>
  );
}
