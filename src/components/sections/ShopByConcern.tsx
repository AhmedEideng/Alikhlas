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
      desc: "مكملات لدعم القوة والتحمل — تركيبات عشبية بمكونات مكتوبة بوضوح.",
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
    <section className="bg-[#f7faf8] py-8 md:py-10">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="حدّد احتياجك"
          title="احتياجك هو نقطة البداية"
          description="ثلاثة اختيارات تحت كل احتياج، وكل منتج منها بصفحة تقول مكوّناته وطريقة استخدامه وتحذيره قبل أي وعد — وعلى واتساب لو احتجت مساعدة."
        />

        <ul className="border-t border-[#e8d9a8]/70">
          {resolvedConcerns.map((concern) => (
            <li
              key={concern.label}
              data-concern-label={concern.label}
              className="group border-b border-[#e8d9a8]/70 transition-colors duration-300 hover:bg-[#fdf8ea]/70"
            >
              <div className="flex flex-col items-center gap-4 py-5 text-center md:gap-5 md:py-6">
                {/* الرقم + العنوان + الوصف */}
                <div className="flex flex-col items-center gap-2 md:gap-2.5">
                  <div className="flex min-w-0 flex-col items-center">
                    <h3 className="flex items-center justify-center gap-2 text-[17px] font-black leading-tight text-[#0b3b26] md:text-lg">
                      <concern.icon
                        className="h-[18px] w-[18px] shrink-0 text-[#0b6b3a]"
                        aria-hidden
                        strokeWidth={2}
                      />
                      {concern.label}
                    </h3>
                    <p className="mx-auto mt-1 max-w-xl text-center text-[12.5px] leading-6 text-[#6d6250] md:text-[13.5px]">
                      {concern.desc}
                    </p>
                    <Link
                      to={concern.link}
                      className="mt-2 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-black text-[#0b6b3a] underline decoration-[#d4a017]/50 decoration-2 underline-offset-4 transition-colors hover:text-[#8a6a12]"
                    >
                      كل منتجات {concern.label}
                      <ArrowLeft
                        aria-hidden
                        className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                      />
                    </Link>
                  </div>
                </div>

                {/* معاينة ٣ منتجات كصور صغيرة */}
                {/* معاينة مصغّرة داخل لوحة عاجية بإطار دهبي — كانت ثلاث صور
                    صغيرة «معلّقة» على الفراغ فتبان كأنها لصقات. */}
                <div className="grid w-full grid-cols-3 gap-2.5 rounded-2xl bg-[#fdfaf1] p-2 ring-1 ring-[#efe4c6] md:flex md:w-auto md:items-center md:justify-center">
                  {concern.products.map((prod) => (
                    <Link
                      key={prod.slug}
                      to="/products/$slug"
                      params={{ slug: prod.slug }}
                      className="block w-full overflow-hidden rounded-xl border border-[#e8d9a8] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d4a017] hover:shadow-[0_10px_20px_-16px_rgba(6,78,43,0.7)] md:w-[84px]"
                      aria-label={`عرض تفاصيل ${prod.name}`}
                      title={prod.name}
                    >
                      <span className="block aspect-square w-full bg-[linear-gradient(160deg,#f4faf6,#ffffff_60%,#fdf7ea)]">
                        <img
                          src={prod.image ? thumbUrl(prod.image, "thumbs") : ""}
                          srcSet={
                            prod.image
                              ? `${thumbUrl(prod.image, "thumbs-180")} 360w, ${thumbUrl(prod.image, "thumbs")} 480w, ${assetUrl(prod.image)} 800w`
                              : ""
                          }
                          sizes="(max-width: 767px) 30vw, 84px"
                          // الصورة زخرفية — الاسم في `aria-label` للرابط
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-1"
                          width={148}
                          height={124}
                        />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
