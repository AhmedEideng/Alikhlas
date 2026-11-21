import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, ShieldCheck, Truck, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ShareButton } from "@/components/ShareButton";
import { shareGuideText } from "@/lib/share";
import { fitSerpTitle } from "@/lib/serp-title";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFAQ } from "@/components/CategoryFAQ";
import { TopicHub } from "@/components/TopicHub";
import { topicForGuide, isPillarPath } from "@/data/topics";
import type { SeoLandingPage } from "@/data/landing-pages";
import {
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  faqSchema,
  injectJsonLd,
  itemListSchema,
  makeMetaDescription,
} from "@/lib/seo";
import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { trackViewItemList } from "@/lib/analytics";

export const Route = createFileRoute("/products/guides/$slug")({
  loader: async ({ params }) => {
    // 🚀 تحميل صفحة اللاندينج كملف JSON فردي (مولّد وقت البناء) بدلاً من استيراد
    // كامل ملف landing-pages.ts (465 kB) — يقطع أي أثر لصفحات اللاندينج على الـ bundle
    // ويجعل كل صفحة guide خفيفة وسريعة التحويل.
    let page: SeoLandingPage | undefined;
    try {
      const res = await fetch(`/landing-pages/${params.slug}.json`);
      if (!res.ok) throw new Error("Landing page not found");
      page = (await res.json()) as SeoLandingPage;
    } catch {
      // إعادة استخدام نفس السلوك: إن لم توجد الصفحة نرمي notFound
    }
    if (!page) throw notFound();

    const { getProductById } = await import("@/data/products");
    type Product = NonNullable<ReturnType<typeof getProductById>>;
    const selectedProducts = page.productIds
      .map((id) => getProductById(id))
      .filter((product): product is Product => Boolean(product));

    // Linked articles
    const { getArticlesForLandingPage } = await import("@/lib/internal-links");
    const articleSlugs = getArticlesForLandingPage(page.slug, page.title);
    let linkedArticles: { slug: string; title: string; emoji: string; readMin: number }[] = [];
    try {
      const { articlesMeta: allArticles } = await import("@/data/articles-meta.generated");
      linkedArticles = allArticles
        .filter((a) => articleSlugs.includes(a.slug))
        .map((a) => ({ slug: a.slug, title: a.title, emoji: a.emoji, readMin: a.readMin }));
    } catch {
      // No articles — silent fallback (existing behaviour)
    }

    return { page, selectedProducts, linkedArticles };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.page
          ? fitSerpTitle(loaderData.page.metaTitle || loaderData.page.title)
          : undefined,
      },
      {
        // Same helper/limit as the prerendered guide HTML (155 chars) so the
        // initial document and the hydrated head agree.
        name: "description",
        content: loaderData?.page ? makeMetaDescription(loaderData.page.metaDescription) : "",
      },
      ...(loaderData?.page.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
  }),
  component: SeoLandingPageComponent,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold">الدليل غير موجود</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  ),
});

function SeoLandingPageComponent() {
  const { page, selectedProducts, linkedArticles } = Route.useLoaderData();
  useScrollTracking(page.title);

  useEffect(() => {
    clearPrerenderJsonLd();
    // The prerendered guide HTML declares a WebPage entity; injecting the same
    // node here keeps the initial document and the hydrated DOM identical.
    injectJsonLd("webpage", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `https://alikhlasmedical.store/products/guides/${page.slug}`,
      name: page.title,
      headline: page.title,
      description: page.metaDescription,
      url: `https://alikhlasmedical.store/products/guides/${page.slug}`,
      inLanguage: "ar-EG",
      about: page.primaryKeyword,
      ...(page.sources?.length ? { citation: page.sources.map((source) => source.url) } : {}),
      ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
    });
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "دليل الاختيار", url: "/products/guides" },
        { name: page.title, url: `/products/guides/${page.slug}` },
      ]),
    );
    injectJsonLd("faq", faqSchema(page.faqs));
    injectJsonLd(
      "itemlist",
      itemListSchema(
        selectedProducts.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.image,
          price: product.price,
        })),
        page.title,
      ),
    );
    if (selectedProducts.length > 0) {
      trackViewItemList(
        `guide_${page.slug}`,
        selectedProducts.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }

    return () => {
      clearJsonLd("webpage");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
      clearJsonLd("itemlist");
    };
  }, [page, selectedProducts]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap items-center gap-1 text-sm">
        <Link to="/" className="inline-flex items-center gap-1 font-bold text-primary">
          <ArrowRight className="h-4 w-4" /> الرئيسية
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <Link to="/products/guides" className="font-bold text-primary">
          دليل الاختيار
        </Link>
      </nav>

      <PageHero eyebrow={page.eyebrow} title={page.title} description={page.heroDescription}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {page.relatedKeywords.slice(0, 4).map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-primary/10 bg-white/75 px-3 py-1 text-xs font-bold text-primary shadow-sm"
            >
              {keyword}
            </span>
          ))}
          {/* (2026-09-16) حلقة الانتشار: الأدلة التجارية تتشارك واتساب
              (رسالة جاهزة: عنوان + لينك) */}
          <ShareButton
            text={shareGuideText(page.title, `/products/guides/${page.slug}`)}
            label="شارك الدليل"
            className="px-3 py-1"
          />
        </div>
      </PageHero>

      <article className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-primary/10 bg-card p-5 leading-8 shadow-card md:p-8">
          <p className="text-base leading-9 text-muted-foreground md:text-lg">{page.intro}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <TrustBox icon={<ShieldCheck className="h-5 w-5" />} title="اختيار واعٍ" />
            <TrustBox icon={<Truck className="h-5 w-5" />} title="شحن سري داخل مصر" />
            <TrustBox icon={<AlertCircle className="h-5 w-5" />} title="تنبيه طبي واضح" />
          </div>

          {page.keyTakeaways && page.keyTakeaways.length > 0 && (
            <div className="mt-6 rounded-2xl border border-primary/15 bg-accent/40 p-4 md:p-5">
              <h2 className="mb-2 text-base font-black text-primary">أهم النقاط قبل أن تختار</h2>
              <ul className="space-y-2">
                {page.keyTakeaways.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-7 text-foreground/90">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-8 space-y-5">
          {page.sections.map((section) => (
            <div key={section.heading} className="rounded-3xl border bg-card p-5 shadow-sm md:p-7">
              <h2 className="mb-3 text-xl font-black md:text-2xl">{section.heading}</h2>
              <p className="text-base leading-9 text-muted-foreground">{section.body}</p>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-3 text-base leading-9 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-4 space-y-2 rounded-2xl bg-background p-4">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-7 text-foreground/90">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {page.comparison && (
          <section className="mt-8" aria-label="جدول مقارنة">
            <h2 className="mb-3 text-xl font-black md:text-2xl">{page.comparison.caption}</h2>
            <p className="mb-2 text-[11px] font-bold text-muted-foreground sm:hidden">
              اسحب الجدول أفقيًا لرؤية كل الأعمدة
            </p>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[36rem] text-right text-sm">
                <thead className="bg-accent/40">
                  <tr>
                    {page.comparison.columns.map((column) => (
                      <th key={column} scope="col" className="p-3 font-black text-primary">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.comparison.rows.map((row) => (
                    <tr key={row[0]} className="border-t">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${row[0]}-${cellIndex}`}
                          className={
                            cellIndex === 0
                              ? "p-3 font-bold text-foreground"
                              : "p-3 leading-7 text-muted-foreground"
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page.sources && page.sources.length > 0 && (
          <section
            className="mt-8 rounded-3xl border bg-card p-5 leading-8"
            aria-label="مصادر الدليل"
          >
            <h2 className="text-xl font-black">المصادر والمراجع</h2>
            {page.updatedAt && (
              <p className="text-sm text-muted-foreground">
                آخر تحديث للمحتوى: <time dateTime={page.updatedAt}>{page.updatedAt}</time>
              </p>
            )}
            <ol className="mt-3 list-inside list-decimal space-y-2">
              {page.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {source.title}
                  </a>
                  <span className="text-sm text-muted-foreground"> · {source.publisher}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-10 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="text-2xl font-black">ابدأ من الأقسام الحالية</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {page.sources?.length
              ? "قراءات مرتبطة تساعدك على متابعة السؤال الذي يهمك، مع فصل المعلومات العامة عن بيانات أي منتج محدد."
              : "هذه الصفحة لا تضيف قسماً جديداً في الشركة؛ هي دليل يساعدك على الوصول للقسم المناسب حسب كلمة البحث والاحتياج."}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {page.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border bg-card p-4 transition-smooth hover:-translate-y-1 hover:shadow-card"
              >
                <h3 className="font-black text-primary">{link.label}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{link.description}</p>
              </a>
            ))}
          </div>
        </section>
      </article>

      {selectedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black md:text-3xl">منتجات مختارة مرتبطة بالبحث</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              اختيارات من الأقسام الحالية مرتبطة بموضوع: {page.primaryKeyword}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {selectedProducts.map((product) => (
              <ProductCard key={product.id} product={product} listName={`guide_${page.slug}`} />
            ))}
          </div>
        </section>
      )}

      {/* مقالات مرتبطة */}
      {linkedArticles && linkedArticles.length > 0 && (
        <section className="mt-10 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="mb-4 text-xl font-black">مقالات تعليمية ذات صلة</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {linkedArticles.map((a) => (
              <Link
                key={a.slug}
                to="/education/$slug"
                params={{ slug: a.slug }}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 transition-all group"
              >
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.readMin} دقائق قراءة</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CategoryFAQ
        title={`أسئلة شائعة عن ${page.primaryKeyword}`}
        description="إجابات مختصرة لتقليل الحيرة قبل اختيار المنتج المناسب من الأقسام الحالية."
        items={page.faqs}
      />

      {/* (2026-09-17) Topic Authority: ربط الدليل بموضوعه (pillar hub +
          مواضيع مرتبطة) — نفس الروابط في الـ HTML الثابت للزاحف */}
      <TopicHub
        topic={topicForGuide(page.slug)}
        isPillar={isPillarPath(`/products/guides/${page.slug}`)}
        selfGuideSlug={page.slug}
      />
    </div>
  );
}

function TrustBox({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background p-4 text-sm font-bold">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        {icon}
      </span>
      {title}
    </div>
  );
}
