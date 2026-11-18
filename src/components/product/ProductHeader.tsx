import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, Lock, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "@/data/product-types";

type CategoryHref = "/products/men" | "/products/women" | "/products/devices";

/**
 *
 * مع مسار تنقل في كبسولة منفصلة وشارات ملوّنة متعددة — وهو بالظبط الشكل الذي
 *
 * الهوية الجديدة: **شريط زمردي داكن واحد** يحمل كل هوية الصفحة (المسار، القسم،
 * الاسم، السعر) بخطوط كبيرة وتباين عالٍ، مع خط ذهبي رفيع ونقشة نقاط ذهبية
 * خفيفة — أسلوب «خزنة فاخرة» لا يظهر في أي صفحة معلوماتية أخرى، فيتميّز
 * المنتج بصريًا فور فتح الصفحة وقبل أي تمرير.
 */
export function ProductHeader({
  productName,
  productNameEn,
  categoryName,
  categoryHref,
  price,
  badge,
  inStock,
  reviewsLabel,
}: {
  productName: string;
  productNameEn?: string;
  categoryName: string;
  categoryHref: CategoryHref;
  price: number;
  badge?: string;
  inStock: boolean;
  reviewsLabel?: string;
}) {
  return (
    <header
      data-product-header
      className="relative mb-5 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(115deg,#032a17_0%,#064e2b_52%,#0b6b3a_100%)] text-white shadow-[0_28px_70px_-42px_rgba(3,42,23,0.95)] ring-1 ring-[#d4a017]/25 md:mb-6 md:rounded-[2rem]"
    >
      {/* نصّال ذهبي علوي — التوقيع البصري للهوية */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#d4a017_18%,#f5cf6b_50%,#d4a017_82%,transparent)]"
      />
      {/* نقشة نقاط ذهبية خفيفة (بلا صور) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(212,160,23,0.35)_1px,transparent_1px)] [background-size:20px_20px]"
      />
      {/* هالة ذهبية ناعمة أسفل بداية الشريط */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -start-20 size-72 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.30),transparent_68%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 end-10 size-56 rounded-full border border-white/10"
      />

      <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6 md:px-10 md:py-7">
        <nav aria-label="مسار التنقل" className="mb-4">
          {/* تباين AA: النص 11px على آخر التدرّج كان 3.4:1 بـwhite/60 — رُفع إلى
            white/80 (≈5.2:1) مع بقاء التمييز البصري بين مسار التنقل والعنوان. */}
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-white/80 sm:text-xs">
            <li>
              <Link to="/" className="transition-colors hover:text-[#f5cf6b]">
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#d4a017]/70">
              <ChevronLeft className="size-3.5" />
            </li>
            <li>
              <Link to={categoryHref} className="transition-colors hover:text-[#f5cf6b]">
                {categoryName}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#d4a017]/70">
              <ChevronLeft className="size-3.5" />
            </li>
            <li className="min-w-0 max-w-[46ch] truncate text-white/85" aria-current="page">
              {productName}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0 md:max-w-[62%]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a017]/45 bg-[#d4a017]/12 px-3 py-1 text-[11px] font-black tracking-wide text-[#f5cf6b]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f5cf6b]" />
                {categoryName}
              </span>
              {badge ? (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black text-white/90">
                  {badge}
                </span>
              ) : null}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
                  inStock
                    ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30"
                    : "bg-[#d4a017]/15 text-[#f5cf6b] ring-1 ring-[#d4a017]/35"
                }`}
              >
                {inStock ? <Check className="size-3" /> : null}
                {inStock ? "متوفر الآن" : "غير متوفر"}
              </span>
            </div>

            <h1 className="text-[1.55rem] font-black leading-[1.32] tracking-tight sm:text-3xl md:text-[2.3rem] md:leading-[1.28]">
              {productName}
            </h1>

            {productNameEn ? (
              <p
                dir="ltr"
                className="mt-1.5 text-start text-xs font-semibold text-white/55 sm:text-sm"
              >
                {productNameEn}
              </p>
            ) : null}

            <ul className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/75">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5">
                <Truck className="size-3.5 text-[#f5cf6b]" /> شحن سري لكل المحافظات
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5">
                <ShieldCheck className="size-3.5 text-[#f5cf6b]" /> إرشادات استخدام واضحة
              </li>
              <li className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 sm:inline-flex">
                <Lock className="size-3.5 text-[#f5cf6b]" /> تغليف محايد بدون اسم المنتج
              </li>
              {reviewsLabel ? (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5">
                  {reviewsLabel}
                </li>
              ) : null}
            </ul>
          </div>

          {/* لوحة السعر — ذهبية على زمردي، أول ما تقع عليه العين */}
          <div className="w-full shrink-0 rounded-2xl border border-[#d4a017]/45 bg-[#04220f]/55 px-4 py-3 text-center backdrop-blur-sm md:w-auto md:min-w-[13rem] md:px-6 md:py-4">
            <span className="block text-[10px] font-black tracking-[0.28em] text-[#e9c46a]/85">
              السعر
            </span>
            <span className="mt-0.5 block text-3xl font-black tabular-nums tracking-tight text-[#f5cf6b] md:text-4xl">
              {formatPrice(price)}
            </span>
            <span className="mt-1 block text-[10px] font-bold text-white/55">
              شامل · الدفع عند الاستلام
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * نفس اللغة البصرية لصفحات الأقسام (رجال/نساء/أجهزة) — بدل الرأس الفاتح
 * المشترك مع الصفحات المعلوماتية، فيصبح لكل قسم منتجات هوية ظاهرة.
 * يحتفظ بـ`data-page-hero` لأن حارس التباين/التقارب في Playwright يعتمد عليه.
 */
export function CatalogBand({
  eyebrow,
  title,
  description,
  promise,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** سطر بريميوم واحد يربط القسم بالحياة الزوجية — بديل شارات الحقائق. */
  promise?: string;
  children?: ReactNode;
}) {
  return (
    <section
      data-page-hero
      className="relative mb-5 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(115deg,#032a17_0%,#064e2b_52%,#0b6b3a_100%)] text-white shadow-[0_26px_64px_-40px_rgba(3,42,23,0.9)] ring-1 ring-[#d4a017]/25 md:mb-6 md:rounded-[2rem]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#d4a017_18%,#f5cf6b_50%,#d4a017_82%,transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:radial-gradient(rgba(212,160,23,0.35)_1px,transparent_1px)] [background-size:20px_20px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -start-16 size-64 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.28),transparent_68%)]"
      />

      <div className="relative z-10 px-5 py-6 sm:px-8 md:px-10 md:py-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a017]/45 bg-[#d4a017]/12 px-3.5 py-1 text-[11px] font-black tracking-wide text-[#f5cf6b]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f5cf6b]" />
            {eyebrow}
          </span>
          <h1 className="mt-3 text-[1.5rem] font-black leading-[1.3] tracking-tight sm:text-3xl md:text-[2.15rem]">
            {title}
          </h1>
          <span
            aria-hidden="true"
            className="mt-3 block h-[2px] w-14 rounded-full bg-[linear-gradient(90deg,rgba(212,160,23,0),#f5cf6b,rgba(212,160,23,0))]"
          />
          {description ? (
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-7 text-white/70 sm:text-sm sm:leading-8">
              {description}
            </p>
          ) : null}
          {promise ? (
            <p className="mx-auto mt-3 max-w-xl text-[11.5px] font-black leading-6 text-[#f5cf6b]/90 sm:text-[13px]">
              {promise}
            </p>
          ) : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </section>
  );
}
