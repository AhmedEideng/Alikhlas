import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowLeft, BookOpen, ShieldCheck, FileText } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { landingPagesMeta } from "@/data/landing-pages-meta.generated";
import {
  absoluteUrl,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  injectJsonLd,
} from "@/lib/seo";

const HUB_TITLE = "دليل الاختيار: كل ما تحتاجه قبل أن تقرر";
const HUB_DESCRIPTION =
  "قائمة بدليل الاختيار كامل في الإخلاص ميديكال: شكل المنتج، الأجهزة، الأجهزة المساعدة، والعبوات. كل دليل يشرح الفرق العملي والتحذيرات ومتى تسأل مختصًا.";

export const Route = createFileRoute("/products/guides/")({
  head: () => ({
    meta: [
      { title: "دليل الاختيار | الإخلاص ميديكال" },
      { name: "description", content: HUB_DESCRIPTION },
    ],
  }),
  component: GuidesHub,
});

function GuidesHub() {
  const guides = useMemo(() => landingPagesMeta.filter((guide) => !guide.noindex), []);

  useEffect(() => {
    // نفس عقد الـ prerender بالحرف: صفحة مجموعة + قائمة روابط + مسار تنقّل.
    // نمسح كتل الـ prerender أولًا حتى لا يتكرر الكيان نفسه بعد الـ hydration.
    clearPrerenderJsonLd();
    injectJsonLd("guides-hub", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": absoluteUrl("/products/guides"),
      name: HUB_TITLE,
      description: HUB_DESCRIPTION,
      inLanguage: "ar-EG",
      url: absoluteUrl("/products/guides"),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: guides.length,
        itemListElement: guides.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/products/guides/${guide.slug}`),
          name: guide.title,
        })),
      },
    });
    injectJsonLd(
      "guides-hub-breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "دليل الاختيار", url: "/products/guides" },
      ]),
    );
    return () => {
      clearJsonLd("guides-hub");
      clearJsonLd("guides-hub-breadcrumb");
    };
  }, [guides]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <PageHero
        eyebrow="قرار واعٍ"
        title="دليل الاختيار: كل ما تحتاجه قبل أن تقرر"
        description="كل دليل يبدأ من سؤال واحد يصلنا من العملاء، ويجيب عليه بالترتيب: الفرق العملي، ثم طريقة الاستخدام، ثم التحذيرات، ثم متى تسأل مختصًا."
      />

      <nav aria-label="مسار التنقل" className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          الرئيسية
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="font-bold text-foreground">دليل الاختيار</span>
      </nav>

      <section className="mb-8 rounded-[1.5rem] border border-[#e8d9a8]/70 bg-[linear-gradient(135deg,#fdf8ea,#ffffff_60%,#f7f2e2)] px-5 py-6 md:px-8">
        <h2 className="mb-3 text-xl font-black text-[#0b3b26] md:text-2xl">
          لماذا نكتب أدلة قبل أن نبيع؟
        </h2>
        <p className="mb-3 text-sm leading-8 text-foreground/90 md:text-base">
          كثير من الطلبات تأتي بسؤال مقلوب: «أي واحد أقوى؟». والجواب الصادق أن السؤال الأنفع هو: «أي
          شكل يناسب استخدامي؟». الدليل لا يبيع شكلًا بعينه، بل يوضّح الفرق في طريقة الاستخدام
          والكمية والتوقيت، حتى يعرف القارئ ما الذي يشتريه قبل أن يطلبه.
        </p>
        <p className="mb-3 text-sm leading-8 text-foreground/90 md:text-base">
          ولا نكتب وعدًا في أي دليل. كل صفحة تذكر حدود الشكل، ومن يجب أن يستبعده، وعلامات تستدعي
          التوقف ومراجعة مختص. المحتوى يُراجع مقابل المصادر المكتوبة في نهاية كل دليل، ويُحدَّث
          بتاريخ ظاهر أعلى قسم المصادر.
        </p>
        <ul className="my-4 grid gap-2 text-sm leading-7 text-foreground/85 md:grid-cols-2 md:text-base">
          <li className="flex items-start gap-2">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
            كل دليل يشرح شكلًا أو قرارًا واحدًا لا أكثر.
          </li>
          <li className="flex items-start gap-2">
            <BookOpen className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
            مقارنة عملية داخل كل دليل بدل كلام عام.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
            تحذيرات صريحة ومصادر طبية في نهاية كل صفحة.
          </li>
        </ul>
      </section>

      <h2 className="mb-4 text-xl font-black md:text-2xl">الأدلة المتاحة ({guides.length})</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            to="/products/guides/$slug"
            params={{ slug: guide.slug }}
            className="group flex flex-col rounded-2xl border bg-card p-5 transition-smooth hover:-translate-y-1 hover:shadow-[0_18px_40px_-34px_rgba(11,59,38,0.55)]"
          >
            <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
              {guide.primaryKeyword}
            </span>
            <h3 className="mb-2 text-base font-black leading-7 text-[#0b3b26]">{guide.title}</h3>
            <p className="text-[13px] leading-7 text-muted-foreground">{guide.description}</p>
            {/* (2026-11-19) الزر يلتصق بأسفل البطاقة بـ mt-auto بدل تمديد الفقرة
                بـ flex-1، فتختفي المسافة البيضاء داخل بطاقات الصف. */}
            <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-black text-primary">
              اقرأ الدليل
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-[1.5rem] border bg-card p-5 md:p-7">
        <h2 className="mb-3 text-xl font-black md:text-2xl">من الدليل إلى القسم المناسب</h2>
        <p className="mb-4 text-sm leading-8 text-muted-foreground md:text-base">
          بعد قراءة الدليل تعرف الشكل الذي يناسبك، فتبدأ من القسم المناسب بدل التنقل بين مئات
          العبوات بلا معيار. الأقسام الثلاثة مرتبة بنفس الترتيب الذي يظهر في المتجر.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/products/men"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-black text-white"
          >
            منتجات الرجال <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to="/products/women"
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-5 py-2.5 text-sm font-black text-primary"
          >
            منتجات النساء
          </Link>
          <Link
            to="/products/devices"
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-5 py-2.5 text-sm font-black text-primary"
          >
            الأجهزة الطبية
          </Link>
        </div>
      </section>
    </div>
  );
}
