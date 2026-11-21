import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Truck, Lock } from "lucide-react";
import { getFeaturedCards } from "@/data/product-cards";
import { thumbUrl, assetUrl } from "@/lib/cache";
import { waLink } from "@/lib/whatsapp";
import { formatPrice } from "@/data/product-types";

/**
 *
 * لكنه طويل (بطاقات منتجات كبيرة + سطر تحت الفترينة + هوامش واسعة).
 * الآن:
 *
 *   - شريط زمردي داكن واحد، هوامش رأسية أقل (`py-5 md:py-6`).
 *   - عنوان (h1) كبير بسطرين، السطر الثاني دهبي، وخط دهبي رفيع يفصله عن
 *     سطر التعريف + زرّان (دهبي أساسي، وشفاف للاستشارة).
 *   - شارات الثقة: سطر نصي واحد على الجوال، وحبات (pills) على الديسكتوب.
 *   - «فترينة» مصغّرة: 3 منتجات حقيقية في صف واحد (صورة مربعة صغيرة +
 *     السعر فقط) — تُبقي الطابع التجاري دون أن تطوّل الرأس.
 *   - الصورة الأولى فقط eager/high (LCP)، والباقي lazy.
 */

const SHOWCASE_COUNT = 3;

export function Hero() {
  const showcase = getFeaturedCards().slice(0, SHOWCASE_COUNT);

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(112deg,#032f1b_0%,#075e36_48%,#0b8a4b_100%)] text-white">
      {/* التوقيع البصري: خط ذهبي أعلى الشريط + نقشة نقاط + هالة */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#e3ac21_18%,#ffd977_50%,#e3ac21_82%,transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(0deg,rgba(255,217,119,0.14),transparent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(rgba(255,217,119,0.45)_1px,transparent_1px)] [background-size:20px_20px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 start-1/4 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,200,64,0.30),transparent_66%)]"
      />
      {/* هالة زمردية فاتحة أعلى اليمين — «نور» يكسر ثقل الكتلة الغامقة */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -end-24 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(32,196,110,0.38),transparent_64%)]"
      />
      {/* ظل داخلي علوي بسيط يعطي عمقًا بدل اللون الواحد */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent)]"
      />

      <div className="relative z-10 container mx-auto px-4 py-3.5 md:py-4">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* ── النص (متوسّط في الشاشة) ── */}
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd977]/45 bg-[#ffd977]/15 px-2.5 py-[3px] text-[9.5px] font-black tracking-wide text-[#ffd977] sm:px-3.5 sm:py-1 sm:text-[11px]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ffd977]" />
              متجر الصحة الزوجية · تغليف محايد
            </span>

            <h1 className="mt-2 text-[1.32rem] font-black leading-[1.22] tracking-[-0.01em] sm:mt-3 sm:text-[2.15rem] sm:leading-[1.18] md:text-[2.6rem]">
              الصحة والسعادة الزوجية
              <br />
              <span className="whitespace-nowrap text-[#ffd977]">بخصوصية كاملة</span>
            </h1>

            <span
              aria-hidden="true"
              className="mx-auto mt-2 block h-[2px] w-10 rounded-full bg-[linear-gradient(90deg,rgba(212,160,23,0),#ffd977,rgba(212,160,23,0))] md:mt-3.5 md:w-16"
            />

            <p className="mx-auto mt-2 max-w-[34rem] text-center text-[11.5px] leading-[1.75] text-white/85 sm:mt-3 sm:text-[14px] sm:leading-[1.95]">
              كل منتج هنا بصفحة تشرح المكوّن، وطريقة الاستخدام، والتحذير، قبل أي وعد. تصلك في عبوة
              سادة بلا اسم منتج، وتدفع عند الاستلام.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-5 sm:gap-2.5">
              <Link
                to="/products/men"
                className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#f0c65a,#e3ac21)] px-4 py-2 text-[12px] font-black text-[#1d1403] shadow-[0_14px_30px_-20px_rgba(212,160,23,0.95)] transition-all hover:brightness-[1.05] sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm"
              >
                اختار من الأقسام
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
              <a
                href={waLink("مرحبًا، عايز أستشير قبل الشراء.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.09] px-4 py-2 text-[12px] font-black text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/[0.09] hover:text-[#ffd977] sm:gap-2 sm:px-6 sm:py-2.5 sm:text-sm"
              >
                استشارة على واتساب
              </a>
            </div>

            {/* الديسكتوب: حبات ثقة */}
            <ul className="mt-5 hidden flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-white/75 md:flex">
              <li className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ring-white/20 bg-white/[0.09] px-3.5 py-1.5">
                <Lock aria-hidden="true" className="size-3.5 text-[#ffd977]" /> تغليف محايد بلا اسم
                منتج
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ring-white/20 bg-white/[0.09] px-3.5 py-1.5">
                <ShieldCheck aria-hidden="true" className="size-3.5 text-[#ffd977]" /> تفاصيل
                وتحذيرات قبل الشراء
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ring-white/20 bg-white/[0.09] px-3.5 py-1.5">
                <Truck aria-hidden="true" className="size-3.5 text-[#ffd977]" /> توصيل 24-72 ساعة
              </li>
            </ul>
          </div>

          {/* ── فترينة مصغّرة (3 منتجات في صف) ── */}
          <div className="hidden items-start justify-center gap-2.5 md:flex">
            {showcase.map((product, index) => (
              <Link
                key={product.id}
                to="/products/$slug"
                params={{ slug: product.slug }}
                className="group flex w-[120px] flex-col overflow-hidden rounded-xl border border-gold-soft bg-white shadow-[0_18px_34px_-24px_rgba(4,60,32,0.55)] text-center text-foreground shadow-[0_14px_28px_-22px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
                aria-label={`عرض تفاصيل ${product.name}`}
              >
                <div className="aspect-square overflow-hidden bg-[linear-gradient(160deg,#f4faf6,#ffffff_60%,#fff9ec)]">
                  {product.image ? (
                    <img
                      src={thumbUrl(product.image, "thumbs-120")}
                      srcSet={`${thumbUrl(product.image, "thumbs-120")} 240w, ${thumbUrl(product.image, "thumbs-180")} 360w, ${thumbUrl(product.image, "thumbs")} 480w, ${assetUrl(product.image)} 800w`}
                      sizes="(max-width: 768px) 30vw, 130px"
                      alt={product.name}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : undefined}
                      decoding="async"
                      width={480}
                      height={480}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-3xl"
                    >
                      {product.emoji}
                    </span>
                  )}
                </div>
                <span className="px-1.5 py-1 text-center text-[11px] font-black tabular-nums text-primary sm:text-xs">
                  {formatPrice(product.price)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
