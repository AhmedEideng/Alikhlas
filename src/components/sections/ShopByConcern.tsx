import { Link } from "@tanstack/react-router";
import { Zap, Clock, Activity, Heart, ArrowLeft } from "lucide-react";
// ونفس الترتيب، بلا وصف طويل في المسار الحرج للصفحة الرئيسية.
import {
  getCardById as getProductById,
  getFeaturedCards as getFeaturedProducts,
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
} from "@/data/product-cards";
import { thumbUrl, assetUrl } from "@/lib/cache";
import { SectionHeading } from "@/components/sections/SectionHeading";

/**
 *
 * كان: شبكة كروت بيضاء متطابقة — كل كارت فيه دايرة زمردية كبيرة + وصف +
 * زر أخضر بعرض كامل مكرر ٤ مرات. ده بالظبط شكل «شبكة كروت القالب».
 * ووصف، معاينة ٣ منتجات كصور صغيرة، ورابط نصي هادئ — أقرب لمجلة/شركة
 * than to a marketplace grid.
 */

const concernCandidates = HOMEPAGE_CONCERN_CANDIDATES;

export function ShopByConcern() {
  // جلب معرفات منتجات مختارات الرئيسية الحالية لمنع التكرار
  const featured = getFeaturedProducts();
  const featuredIds = new Set(featured.map((p) => p.id));

  // بناء وحساب الفئات الأربعة ديناميكياً بدون تكرار
  const resolvedConcerns = [
    {
      label: "علاجات التأخير",
      icon: Clock,
      desc: "حلول التحكم في سرعة القذف مع خيارات موضعية واضحة المكونات وطريقة الاستخدام.",
      link: "/products/men",
      products: concernCandidates.delay
        .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "القوة والأداء",
      icon: Zap,
      desc: "مكملات لدعم القوة والتحمل، تركيبات عشبية بمكونات مكتوبة بوضوح.",
      link: "/products/men",
      products: concernCandidates.strength
        .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "أجهزة طبية",
      icon: Activity,
      desc: "أجهزة دعم غير دوائية، مع أولوية لأجهزة الـ VED الأكثر احترافية.",
      link: "/products/devices",
      products: concernCandidates.devices
        .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "الرغبة والإثارة للنساء",
      icon: Heart,
      desc: "منتجات مخصّصة لدعم الرغبة والراحة للنساء، ضمن تشكيلة النساء الموثوقة.",
      link: "/products/women",
      products: concernCandidates.women
        .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
  ];

  return (
    <section className="bg-[#eefaf3] py-6 md:py-8">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="حدّد احتياجك"
          title="احتياجك هو نقطة البداية"
          description="ثلاثة اختيارات تحت كل احتياج، وكل منتج منها بصفحة تقول مكوّناته وطريقة استخدامه وتحذيره قبل أي وعد، وعلى واتساب لو احتجت مساعدة."
        />

        {/* شبكة ٢×٢: كانت أربعة صفوف بعرض الشاشة كلها وفيها فراغ رأسي كبير
            حول ثلاث صور صغيرة. الآن كل احتياج كارت مكتمل — الصور أكبر
            (ثلث عرض الكارت) والمساحات الميتة اختفت. */}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {resolvedConcerns.map((concern) => (
            <li
              key={concern.label}
              data-concern-label={concern.label}
              className="group flex flex-col rounded-3xl bg-white p-3 sm:p-3.5 ring-1 ring-[#e8c473] shadow-[0_14px_30px_-24px_rgba(6,78,43,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(6,78,43,0.5)] hover:ring-[#e3ac21] sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-[16.5px] font-black leading-tight text-[#0b3b26] sm:text-[17.5px]">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#fff7e4] ring-1 ring-[#f0d59a]"
                    >
                      <concern.icon className="h-[17px] w-[17px] text-[#0c7a42]" strokeWidth={2} />
                    </span>
                    {concern.label}
                  </h3>
                  <p className="mt-1.5 min-h-[44px] text-[12.5px] leading-[1.75] text-[#5a665f] sm:text-[13px]">
                    {concern.desc}
                  </p>
                </div>
              </div>

              {/* معاينة ٣ منتجات — صور كبيرة نسبيًا تملأ عرض الكارت */}
              <ul className="mb-2.5 mt-3 grid grid-cols-3 gap-1.5">
                {concern.products.map((prod) => (
                  <li key={prod.slug}>
                    <Link
                      to="/products/$slug"
                      params={{ slug: prod.slug }}
                      className="block overflow-hidden rounded-xl bg-[#fff9ec] ring-1 ring-[#e8c473] transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#e3ac21] hover:shadow-[0_12px_22px_-16px_rgba(6,78,43,0.6)]"
                      aria-label={`عرض تفاصيل ${prod.name}`}
                      title={prod.name}
                    >
                      <span className="block aspect-[4/5] w-full">
                        <img
                          src={prod.image ? thumbUrl(prod.image, "thumbs") : ""}
                          srcSet={
                            prod.image
                              ? `${thumbUrl(prod.image, "thumbs-180")} 360w, ${thumbUrl(prod.image, "thumbs")} 480w, ${assetUrl(prod.image)} 800w`
                              : ""
                          }
                          sizes="(max-width: 640px) 30vw, (max-width: 767px) 30vw, 170px"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-1"
                          width={148}
                          height={185}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center justify-between border-t border-[#f0e2bd] pt-2.5">
                <Link
                  to={concern.link}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-black text-[#0c7a42] transition-colors hover:text-[#8f6508]"
                >
                  كل منتجات {concern.label}
                  <ArrowLeft
                    aria-hidden
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                  />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
