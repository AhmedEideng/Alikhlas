import { Link } from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";
import { ARTICLE_COUNT, featuredArticleCards } from "@/data/articles-cards.generated";
import { assetUrl, thumbUrl } from "@/lib/cache";
import { SectionHeading } from "@/components/sections/SectionHeading";

// 🚀 البطاقات مولّدة وقت البناء من نفس المصدر (src/data/articles.ts) في
// module صغير بلا حقل content — عشان الـ chunk الكامل data-articles (~78KB)
// ما يدخلش المسار الحرج للـ homepage (نافذة الـ LCP). الترتيب = الترتيب
// الفعّال (نية شراء أعلى أولاً) ومحدد في scripts/generate-sitemap.mjs.
// CLS: استيراد ثابت فتظهر الكروت مع أول render ولا قفزة تخطيط.
const featured = featuredArticleCards;

export function ArticlesGrid() {
  if (featured.length === 0) return null;

  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="توعية صحية موثوقة"
          title="مكتبة التوعية"
          description="مقالات تُشرح فيها المشكلة وخيارات التعامل معها، بمصادر مذكورة في نهاية كل مقال وقسم صريح لتحذيرات الاستخدام."
          action={{ label: "كل المقالات", href: "/education" }}
          align="center"
        />

        {/* شبكة متجاوبة تعرض 4 مقالات في صف واحد على الشاشات الكبيرة */}
        {/* (2026-11-16) الارتفاع الثابت h-[420px] بقى مشروطًا بوجود صورة فقط؛
            بطاقة بلا صورة كانت تحمل فراغًا أبيض بطول ثلث الشاشة. */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {featured.map((article) => (
            <Link
              key={article.slug}
              to="/education/$slug"
              params={{ slug: article.slug }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8c473]/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#e3ac21]/50 hover:shadow-md"
            >
              {article.image ? (
                <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted">
                  <img
                    src={thumbUrl(article.image, "thumbs")}
                    srcSet={`${thumbUrl(article.image, "thumbs-180")} 360w, ${thumbUrl(article.image, "thumbs")} 480w, ${assetUrl(article.image)} 1280w`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    alt={article.imageAlt ?? article.title}
                    width={640}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-primary backdrop-blur-sm">
                    {article.category}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 border-b border-[#e8c473]/70 bg-[linear-gradient(105deg,#fffaef,#fffdf8)] px-4 py-2.5">
                  <span className="text-[10.5px] font-black tracking-wide text-[#8f6508]">
                    {article.category}
                  </span>
                  <BookOpen className="h-3.5 w-3.5 text-[#0b6b3a]/70" aria-hidden />
                </div>
              )}

              <div className="flex flex-1 flex-col items-center p-4.5 text-center">
                <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{article.readMin} دقائق قراءة</span>
                </div>

                <h3 className="mb-1.5 line-clamp-2 text-center text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {article.title}
                </h3>

                <p className="line-clamp-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>

                <div className="mt-auto flex items-center justify-center gap-1.5 pt-3.5 text-xs font-bold text-primary">
                  اقرأ المقال الآن
                  <BookOpen className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/education"
            className="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            باقي المقالات في المكتبة ({ARTICLE_COUNT} مقالة)
            <BookOpen className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
