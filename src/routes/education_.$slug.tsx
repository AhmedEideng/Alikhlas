import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  ExternalLink,
  List,
  PenLine,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ShareButton } from "@/components/ShareButton";
import { shareArticleText } from "@/lib/share";
import {
  absoluteUrl,
  articleSchema,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  injectJsonLd,
  makeMetaDescription,
} from "@/lib/seo";
import { ogArticleImage } from "@/data/og-articles.generated";
import { editorialTrustSignals, type EditorialSignalIcon } from "@/data/editorial-trust-signals";
import { type Article } from "@/data/articles";
import { type ArticleMeta } from "@/data/articles-meta.generated";
import { ArticleContentWithAds } from "@/components/sections/ArticleContentWithAds";
import { articleSections } from "@/lib/article-blocks";
import { ProductCard } from "@/components/ProductCard";
import { TopicHub } from "@/components/TopicHub";
import { topicForArticle, isPillarPath } from "@/data/topics";
import { assetUrl, thumbUrl } from "@/lib/cache";

export const Route = createFileRoute("/education_/$slug")({
  loader: async ({ params }) => {
    // meta + body متقسمين: meta (بلا نصوص) للروابط + body للـ content/sources
    const [{ articlesMeta }, { articleBodies }] = await Promise.all([
      import("@/data/articles-meta.generated"),
      import("@/data/article-content.generated"),
    ]);
    const meta = articlesMeta.find((a) => a.slug === params.slug);
    if (!meta) throw notFound();
    const article: Article = { ...meta, ...articleBodies[meta.slug] };
    if (!article.content || !Array.isArray(article.sources)) throw notFound();
    // Smart related articles
    const { getRelatedArticles, getProductsForArticle } = await import("@/lib/internal-links");
    const relatedSlugs = getRelatedArticles(article.slug, article.category, articlesMeta);
    const related = relatedSlugs
      .map((s) => articlesMeta.find((a) => a.slug === s))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    // Linked products
    const { getProductById } = await import("@/data/products");
    const productIds = getProductsForArticle(article.slug);
    type Product = NonNullable<ReturnType<typeof getProductById>>;
    const linkedProducts = productIds
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 6);

    return { article, related, linkedProducts };
  },
  head: ({ loaderData }) => ({
    meta: [
      // حتى لا يختلف <head> بعد الـ hydration عن HTML الثابت.
      // (مكتوب صريحًا هنا لا عبر `serpTitleOf` — استيراد القيمة من
      { title: loaderData?.article?.seoTitle ?? loaderData?.article?.title },
      {
        // Same helper/limit as the prerendered copy so the initial HTML and the
        // hydrated <head> never declare two different descriptions.
        name: "description",
        content: loaderData?.article ? makeMetaDescription(loaderData.article.excerpt) : "",
      },
      { property: "og:type", content: "article" },
      // (og-articles.generated) + مطلقة دائماً لتتطابق النسختان الثابتة/بعد الإhydration.
      {
        property: "og:image",
        content: loaderData?.article
          ? absoluteUrl(ogArticleImage(loaderData.article.slug) ?? loaderData.article.image)
          : undefined,
      },
      {
        name: "twitter:image",
        content: loaderData?.article
          ? absoluteUrl(ogArticleImage(loaderData.article.slug) ?? loaderData.article.image)
          : undefined,
      },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold">المقال غير موجود</h1>
      <Link to="/education" className="mt-4 inline-block text-primary">
        العودة للمقالات
      </Link>
    </div>
  ),
});

function TrustCard({
  icon,
  title,
  name,
  description,
}: {
  icon: ReactNode;
  title: string;
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
          {icon}
        </span>
        <div>
          <div className="text-xs font-bold text-primary">{title}</div>
          <div className="font-black">{name}</div>
        </div>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function RelatedCard({ a }: { a: ArticleMeta }) {
  const [isError, setIsError] = useState(false);
  return (
    <Link
      key={a.slug}
      to="/education/$slug"
      params={{ slug: a.slug }}
      className="group rounded-2xl border bg-card p-5 hover:shadow-card transition-smooth overflow-hidden flex flex-col"
    >
      {a.image && !isError ? (
        <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden border-b">
          <img
            src={a.image ? assetUrl(a.image) : undefined}
            alt={a.title}
            width={800}
            height={450}
            loading="lazy"
            onError={() => setIsError(true)}
            className="w-full h-full object-cover group transition-smooth"
          />
        </div>
      ) : (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e8c473] bg-[#fffaef] text-[#0b6b3a]">
          <BookOpen className="h-5 w-5" aria-hidden />
        </div>
      )}
      <h3 className="font-bold leading-snug group-hover:text-primary transition-smooth">
        {a.title}
      </h3>
    </Link>
  );
}

const trustSignalIcons: Record<EditorialSignalIcon, typeof BookOpen> = {
  pen: PenLine,
  book: BookOpen,
  warning: AlertTriangle,
  search: Search,
  stethoscope: Stethoscope,
};

function ArticlePage() {
  const { article, related, linkedProducts } = Route.useLoaderData();
  const [isMainImageError, setIsMainImageError] = useState(false);
  // فهرس المحتويات يُبنى من نفس عناوين الأقسام التي يرسمها متن المقال.
  const sections = articleSections(article.content);

  // Track if user reads 50% or 90% of the article (High intent reader!)
  useScrollTracking(article.title);

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd("article", articleSchema(article));
    // The prerendered article HTML also declares a BreadcrumbList; injecting the
    // same node keeps the initial document and the hydrated DOM identical
    // (clearPrerenderJsonLd removes every prerendered block first).
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "المقالات", url: "/education" },
        { name: article.title, url: `/education/${article.slug}` },
      ]),
    );
    return () => {
      clearJsonLd("article");
      clearJsonLd("breadcrumb");
    };
  }, [article]);

  return (
    <article className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <Link to="/education" className="inline-flex items-center gap-1 text-sm text-primary mb-5">
        <ArrowRight className="h-4 w-4" /> كل المقالات
      </Link>

      <PageHero eyebrow={article.category} title={article.title} description={article.excerpt}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm border border-primary/10">
            <Clock className="h-4 w-4 text-primary" /> {article.readMin} دقائق قراءة
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm border border-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" /> آخر تحديث: {article.updatedAt}
          </div>
          {/* (2026-09-16) حلقة الانتشار: المحتوى التوعوي هو اللي بيتشارك
              "لحد يعرفه" — رسالة جاهزة (عنوان + لينك) بدون بيع */}
          <ShareButton
            text={shareArticleText(article.title, `/education/${article.slug}`)}
            label="شارك المقال"
            className="px-4 py-2 text-sm"
          />
        </div>
      </PageHero>

      {/* (2026-11-16) صورة تحريرية 16:9 (1280×720) بنص بديل وصفي، وبعدها فهرس
          المحتويات دائمًا للمقالات الطويلة — الصورة لا تلغي الفهرس. */}
      {article.image && !isMainImageError ? (
        <figure className="mb-6 overflow-hidden rounded-3xl border border-[#e8c473]/70 bg-gradient-soft shadow-card">
          <img
            src={thumbUrl(article.image, "thumbs")}
            srcSet={`${thumbUrl(article.image, "thumbs-120")} 240w, ${thumbUrl(article.image, "thumbs-180")} 360w, ${thumbUrl(article.image, "thumbs")} 480w, ${assetUrl(article.image)} 1280w`}
            sizes="(max-width: 768px) 100vw, 860px"
            alt={article.imageAlt ?? article.title}
            width={1280}
            height={720}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => setIsMainImageError(true)}
            className="aspect-video w-full object-cover"
          />
        </figure>
      ) : null}

      {/* (2026-09-17, Phase C) Answer-first: الإجابة في 10 ثواني قبل
          القراءة العميقة — يخدم القارئ وأيضًا AI Overviews/الـ snippets */}
      {article.keyTakeaways && article.keyTakeaways.length > 0 && (
        <section
          aria-label="أهم النقاط"
          className="mb-8 rounded-3xl border border-primary/20 bg-primary/5 p-5 md:p-6"
        >
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
            <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-[#e3ac21]" /> أهم النقاط
          </h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {article.keyTakeaways.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 text-sm leading-6 text-foreground/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8 grid gap-3 md:grid-cols-2">
        <TrustCard
          icon={<UserCheck className="h-5 w-5" />}
          title={article.author.role}
          name={article.author.name}
          description={article.author.credentials}
        />
        <TrustCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title={article.reviewer.role}
          name={article.reviewer.name}
          description={article.reviewer.credentials}
        />
      </section>

      {sections.length >= 3 ? (
        <nav
          aria-label="محتويات المقال"
          className="mb-8 rounded-3xl border border-[#e8c473] bg-[linear-gradient(105deg,#fffaef,#ffffff)] p-5 md:p-6"
        >
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black text-[#8f6508]">
            <List className="h-4 w-4" aria-hidden />
            محتويات المقال
          </h2>
          <ol className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-[11px] font-black tabular-nums text-[#e9b62c]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#${section.id}`}
                  className="text-[13px] font-bold leading-6 text-[#0b3b26] transition-colors hover:text-[#8f6508] hover:underline hover:decoration-[#e3ac21]/60 hover:underline-offset-4"
                >
                  {section.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {/* 🚀 محرك حقن المنتجات داخل محتوى المقال */}
      <ArticleContentWithAds content={article.content} linkedProducts={linkedProducts} />

      <section className="mt-12 rounded-3xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> منهجية الثقة والمراجعة
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {editorialTrustSignals.map((signal) => {
            const Icon = trustSignalIcons[signal.icon];
            return (
              <li
                key={signal.text}
                className="flex items-start gap-2.5 rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground"
              >
                <Icon className="mt-1.5 h-4 w-4 shrink-0 text-[#e9b62c]" aria-hidden />
                <span>{signal.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold">المصادر الطبية المستخدمة</h2>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">
          المصادر أدناه هي ما استندنا إليه في هذا المقال. المعلومات نفسها للفهم العام، أما التشخيص
          والعلاج فيحتاجان طبيبًا يفحص الحالة لا صفحة تقرأها.
        </p>
        <ul className="space-y-3">
          {article.sources.map((source) => (
            <li key={source.url} className="rounded-2xl border bg-background p-4">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-sm font-bold text-primary hover:underline"
              >
                <ExternalLink className="mt-1 h-4 w-4 shrink-0" />
                <span>{source.title}</span>
              </a>
              <div className="mt-1 text-xs text-muted-foreground">{source.publisher}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex items-start justify-center gap-2.5 rounded-2xl border border-[#e8c473] bg-[#fdf9ee] p-6 text-center">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e9b62c]" aria-hidden />
        <p className="text-sm leading-6 text-[#6d6250]">
          اقرأها كمعلومة تُعينك على طرح السؤال الصحيح على طبيبك، لا كبديل عن زيارته.
        </p>
      </div>

      {/* منتجات مرتبطة */}
      {linkedProducts && linkedProducts.length > 0 && (
        <section className="mt-12 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="mb-4 text-xl font-black">منتجات ذات صلة</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {linkedProducts.map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 hover:border-primary/30 transition-all group text-center"
              >
                {p.image && (
                  <img
                    src={p.image ? thumbUrl(p.image, "thumbs-120") : undefined}
                    alt={p.name}
                    className="w-16 h-16 object-cover rounded-lg"
                    loading="lazy"
                  />
                )}
                <div>
                  <h3 className="font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {p.name}
                  </h3>
                  <p className="text-xs text-primary font-bold mt-1">{p.price} ج.م</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* منتجات مقترحة في نهاية المقال */}
      {linkedProducts && linkedProducts.length > 0 && (
        <section className="mt-10 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-8">
          <h2 className="mb-2 text-2xl font-black">منتجات تساعد في حل المشكلة</h2>
          <p className="text-muted-foreground mb-6">
            منتجات مختارة ذات صلة بموضوع المقال، اقرأ صفحة كل منتج ومكوناته وتحذيراته قبل الشراء.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {linkedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-6">مقالات ذات صلة</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((a) => (
            <RelatedCard key={a.slug} a={a} />
          ))}
        </div>
      </section>

      {/* (2026-09-17) Topic Authority: ربط المقال بموضوعه (pillar hub +
          مواضيع مرتبطة) — نفس الروابط في الـ HTML الثابت للزاحف */}
      <TopicHub
        topic={topicForArticle(article.slug)}
        isPillar={isPillarPath(`/education/${article.slug}`)}
        selfArticleSlug={article.slug}
      />
    </article>
  );
}
