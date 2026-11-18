import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clock, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/PageHero";
import type { ArticleMeta } from "@/data/articles-meta.generated";
import { EDUCATION_META } from "@/data/policy-meta";
import { assetUrl, thumbUrl } from "@/lib/cache";

export const Route = createFileRoute("/education")({
  loader: async () => {
    const [{ articlesMeta }, { educationHub }] = await Promise.all([
      import("@/data/articles-meta.generated"),
      import("@/data/education-hub"),
    ]);
    return { articles: articlesMeta, intro: educationHub.sections };
  },
  head: () => ({
    meta: [
      { title: EDUCATION_META.title },
      { name: "description", content: EDUCATION_META.description },
    ],
  }),
  component: EducationIndex,
});

function ArticleCard({ a, priority = false }: { a: ArticleMeta; priority?: boolean }) {
  const [isError, setIsError] = useState(false);

  return (
    <Link
      to="/education/$slug"
      params={{ slug: a.slug }}
      className="group flex flex-col rounded-2xl border bg-card overflow-hidden transition-smooth hover:-translate-y-1 hover:shadow-[0_18px_40px_-34px_rgba(11,59,38,0.55)]"
    >
      {a.image && !isError ? (
        <div className="aspect-video bg-gradient-soft overflow-hidden">
          <img
            src={thumbUrl(a.image, "thumbs")}
            srcSet={`${thumbUrl(a.image, "thumbs-180")} 360w, ${thumbUrl(a.image, "thumbs")} 480w, ${assetUrl(a.image)} 1280w`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            alt={a.imageAlt ?? a.title}
            width={640}
            height={360}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            onError={() => setIsError(true)}
            className="h-full w-full object-cover transition-smooth duration-500"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-[#e8d9a8]/70 bg-[linear-gradient(105deg,#fdf8ea,#fffdf8)] px-5 py-3">
          <span className="text-[11px] font-black tracking-wide text-[#8a6a12]">{a.category}</span>
          <BookOpen className="h-4 w-4 text-[#0b6b3a]/70" aria-hidden />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {a.image && !isError ? (
          <span className="mb-2 text-xs font-bold text-primary">{a.category}</span>
        ) : null}
        <h2 className="mb-2 text-[17px] font-black leading-snug text-[#0b3b26] transition-colors group-hover:text-[#8a6a12]">
          {a.title}
        </h2>
        <span
          aria-hidden
          className="mb-2.5 block h-[3px] w-9 rounded-full bg-[linear-gradient(90deg,#d4a017,#0b6b3a)]"
        />
        <p className="mb-3 line-clamp-3 text-[13px] leading-6 text-muted-foreground">{a.excerpt}</p>
        <div className="mt-auto flex items-center justify-between border-t border-dashed border-primary/10 pt-2.5 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {a.readMin} دقائق قراءة
          </span>
          <span className="inline-flex items-center gap-1 font-black text-primary">
            اقرأ <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EducationIndex() {
  const { articles, intro } = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <PageHero
        eyebrow="تعليم • توعية • علم"
        title="إرشادات المختصين — مكتبة التوعية"
        description="مقالات توعوية مع مصادر واضحة تساعدك على فهم جسدك وعلاقاتك بشكل صحي وآمن. معرفتك هي الخطوة الأولى نحو راحة وثقة أكبر."
      />

      {/* (2026-11-16) مقدمة المكتبة من مصدرها الواحد `@/data/education-hub`
          — نفس النص الذي يراه الزاحف في HTML الثابت، بدل بطاقة «قيد الإعداد»
          التي كانت تناقض المقالات المنشورة تحتها. */}
      <article className="mx-auto mb-8 max-w-3xl rounded-[1.75rem] border border-[#e8d9a8]/70 bg-[linear-gradient(135deg,#fdf8ea,#ffffff_60%,#f7f2e2)] px-6 py-7 md:px-9 md:py-9">
        {intro.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 mt-6 text-xl font-black text-[#0b3b26] first:mt-0 md:text-2xl">
              {section.heading}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mb-3 text-sm leading-8 text-foreground/90 md:text-base"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="my-4 list-disc space-y-2 pe-6 text-sm leading-7 text-foreground/85 md:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>

      {articles.length === 0 ? (
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#e8d9a8] bg-[linear-gradient(135deg,#fdf8ea,#ffffff_55%,#f7f2e2)] p-8 text-center shadow-[0_18px_40px_-34px_rgba(11,59,38,0.55)] md:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e8d9a8] bg-white text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black md:text-2xl">مكتبة المقالات قيد الإعداد</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            نعمل حالياً في الإخلاص ميديكال على إعداد سلسلة مقالات توعوية وأدلة صحية متكاملة بمصادر
            طبية موثوقة. في هذه الأثناء، يمكنك تصفح أقسام المنتجات الأصلية.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/products/men"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-black text-white shadow-sm transition hover:shadow-md"
            >
              تصفح منتجات الرجال <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              to="/products/women"
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-6 py-3 text-sm font-black text-primary transition hover:border-[#d4a017]/60"
            >
              تصفح منتجات النساء
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, index) => (
            <ArticleCard key={a.slug} a={a} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
