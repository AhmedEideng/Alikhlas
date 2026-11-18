import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { PROMO_TITLE, PROMO_TAGLINE, PROMO_TIERS, PROMO_PERMANENCE_NOTE } from "@/lib/promo";

/**
 * 🪜 «سلّم التوفير» — شريط أفقي مضغوط أسفل الرأس مباشرة.
 *
 * الشريط الآن **سلّم من ثلاث درجات ظاهرة** بالترتيب التصاعدي، كل درجة تعرض
 * حدّها المالي ونسبتها (١٠٠٠ ج.م ← ١٠٪ / ١٥٠٠ ج.م ← ١٥٪ / ٢٠٠٠ ج.م ← ٢٠٪)
 * حتى يرى العميل فورًا كيف يصعد. النسب نفسها لم تتغير.
 *
 * - الخلفية: عاجي بتدرّج ذهبي خفيف + خط ذهبي رقيق أعلى وأسفل.
 * - ثابت بلا state ولا مؤقّت (لا عدّاد ولا إلحاح مصطنع).
 */
export function AnniversaryPromo() {
  const steps = [...PROMO_TIERS].reverse(); // من الأصغر للأكبر: 1000 ← 1500 ← 2000

  return (
    <section
      id="savings-ladder"
      aria-label={PROMO_TITLE}
      className="relative isolate w-full overflow-hidden border-y border-[#e8d9a8]"
      style={{
        backgroundImage:
          "linear-gradient(100deg, #fdf6e3 0%, #fffdf8 46%, #f8f1dd 78%, #fdf6e3 100%)",
        backgroundColor: "#fdf6e3",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, #d4a017 22%, #c8961e 55%, transparent)",
          opacity: 0.75,
        }}
      />

      {/* ── الجوال: عنوان + سلّم أفقي + ملاحظة ── */}
      <div className="relative px-3 py-2.5 md:hidden">
        <div className="flex flex-col items-center gap-1.5 text-center text-[#0b3b26]">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-wider text-[#8a6a12]">
              {PROMO_TAGLINE}
            </div>
            <div className="mt-0.5 text-sm font-black leading-tight">{PROMO_TITLE}</div>
          </div>
          <Link
            to="/products/men"
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-gradient-brand px-3 py-2 text-[11px] font-black text-white shadow-sm transition-transform active:scale-95"
          >
            اصعد درجتك
            <ChevronLeft className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-2 flex items-stretch gap-1.5">
          {steps.map((tier, i) => (
            <div
              key={tier.threshold}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e8d9a8] bg-white px-1.5 py-1 text-[10px] font-black text-[#8a6a12]"
            >
              <span className="tabular-nums">{tier.threshold}</span>
              <span className="text-[#0b3b26]">{tier.label}</span>
              {i < steps.length - 1 ? (
                <ChevronLeft className="h-3 w-3 text-[#c8961e]" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#4a5a51]">
          <span>{PROMO_PERMANENCE_NOTE}</span>
        </div>
      </div>

      {/* ── الديسكتوب: صف واحد ── */}
      <div className="relative hidden items-center justify-center gap-3 px-4 py-2.5 md:flex">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="text-[#0b3b26]">
            <div className="text-[10px] font-black tracking-wider text-[#8a6a12]">
              {PROMO_TAGLINE}
            </div>
            <div className="text-sm font-black leading-tight">{PROMO_TITLE}</div>
          </div>
        </div>

        <div className="h-7 w-px shrink-0 bg-[#e3d3a4]" />

        {/* درجات السلّم بترتيب تصاعدي */}
        <div className="flex items-center gap-1">
          {steps.map((tier, i) => (
            <div key={tier.threshold} className="flex items-center gap-1">
              <div className="flex items-center gap-1 rounded-full border border-[#e8d9a8] bg-white px-2.5 py-1 text-[11px] font-black text-[#8a6a12]">
                <span className="tabular-nums">{tier.threshold} ج.م</span>
                <span className="text-[#c8961e]">←</span>
                <span className="text-[#0b3b26]">{tier.label}</span>
              </div>
              {i < steps.length - 1 ? (
                <span aria-hidden className="text-[#d9c583]">
                  ─
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="h-7 w-px shrink-0 bg-[#e3d3a4]" />

        <div className="flex items-center gap-1.5 text-[#4a5a51]">
          <span className="text-[10px] font-bold">{PROMO_PERMANENCE_NOTE}</span>
        </div>

        <Link
          to="/products/men"
          className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          اصعد درجتك
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
