import { Link } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope, Leaf } from "lucide-react";

/**
 * عنوان قصير + فكرة واحدة + ٣ خطوات صغيرة يمكن عملها النهارده، بدل فقرة
 */
const dailyTip = {
  eyebrow: "نصيحة اليوم",
  headline: "٣ قرارات صغيرة… بتفرق في يومك.",
  text: "مش محتاج تغيّر كل حاجة مرة واحدة. الزنك الموجود في المحار والمكسرات، والمياه الكافية، والمشي اليومي، كلهم بيدعموا الدورة الدموية والطاقة بشكل مباشر.",
  steps: ["٢ لتر مياه على مدار اليوم", "حصة مكسرات أو محار أسبوعيًا", "٢٠ دقيقة مشي يوميًا"],
};

export function DailyAdvice() {
  return (
    <section className="py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[#e8c473] bg-[linear-gradient(135deg,#fffaef_0%,#ffffff_48%,#f7f2e2_100%)] p-7 shadow-[0_20px_50px_-40px_rgba(11,59,38,0.6)] md:p-10">
          {/* ✨ خيط ذهبي رقيق أعلى البطاقة */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent, #e3ac21 25%, #e9b62c 60%, transparent)",
              opacity: 0.8,
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(212,160,23,0.22) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eecd8a] bg-white px-4 py-1.5 text-[11px] font-black tracking-wide text-[#8f6508]">
                <Stethoscope className="h-4 w-4 text-[#e9b62c]" aria-hidden />
                {dailyTip.eyebrow}
              </div>

              <h2 className="mt-3 text-2xl font-black leading-snug text-[#0b3b26] md:text-[1.75rem]">
                {dailyTip.headline}
              </h2>
              <p className="mt-2 text-sm font-medium leading-7 text-[#4a5a51] md:text-base">
                {dailyTip.text}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <Link
                  to="/products/men"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:shadow-md"
                >
                  ابدأ بمنتجات الرجال
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/products/women"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-5 py-3 text-sm font-black text-[#064e2b] transition-colors hover:border-[#e3ac21]/60 hover:text-[#8f6508]"
                >
                  منتجات النساء <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* (2026-11-16) بدل الدايرة العملاقة + شارة «+3» الغامضة: بطاقة
                «٣ خطوات» صغيرة مرتّبة، كل خطوة برقمها — أوضح ومعناها ظاهر. */}
            <div className="flex justify-center">
              <div className="w-full max-w-[15rem] rounded-[1.75rem] border border-[#e8c473] bg-white/90 p-4">
                <div className="mb-3 flex items-center gap-2 border-b border-dashed border-[#e8c473] pb-2.5">
                  <Leaf className="h-4 w-4 text-[#0b6b3a]" aria-hidden strokeWidth={2} />
                  <span className="text-[11px] font-black text-[#8f6508]">خطوات النهارده</span>
                </div>
                <ol className="space-y-2">
                  {dailyTip.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-2 text-[11.5px] font-bold leading-5 text-[#0b3b26]"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0b6b3a] text-[9px] font-black text-white">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
