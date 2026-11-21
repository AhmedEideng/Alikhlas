import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  align?: "center" | "right";
}

/**
 *
 * كل صفحة داخلية (بحث/مفضلة/من نحن/تواصل/السياسات). الآن هو **باند زمردي داكن
 * مضغوط** بنفس توقيع رأس الرئيسية وصفحة المنتج: خط ذهبي أعلى، نقشة نقاط،
 * عنوان أبيض كبير، وشارة ذهبية للنص التعريفي.
 *
 * يحتفظ بـ`data-page-hero` لأن حرّاس Playwright (التقارب/التمرير الأفقي) تعتمد عليه.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  align = "center",
}: PageHeroProps) {
  const centered = align === "center";

  return (
    <section
      data-page-hero
      className="relative mb-5 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(118deg,#032a17_0%,#064e2b_58%,#0b6b3a_100%)] text-white md:mb-6 md:rounded-[1.75rem]"
    >
      {/* خط ذهبي أعلى الباند */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#e3ac21_20%,#ffd977_50%,#e3ac21_80%,transparent)]"
      />
      {/* نقشة نقاط ذهبية + هالة */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:radial-gradient(rgba(212,160,23,0.35)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 start-1/4 size-72 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.18),transparent_70%)]"
      />

      <div
        className={`relative z-10 px-5 py-5 sm:px-8 md:px-10 md:py-6 ${
          centered ? "text-center" : "text-right"
        }`}
      >
        {eyebrow && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-[#e3ac21]/45 bg-[#e3ac21]/12 px-3 py-1 text-[10.5px] font-black tracking-wide text-[#ffd977] sm:text-[11px] ${
              centered ? "mx-auto" : ""
            }`}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ffd977]" />
            {eyebrow}
          </span>
        )}

        <h1
          className={`text-[1.4rem] font-black leading-[1.3] tracking-tight sm:text-3xl md:text-[2.1rem] ${
            eyebrow ? "mt-2.5" : ""
          }`}
        >
          {title}
        </h1>

        {description && (
          <p
            className={`mt-2 max-w-2xl text-[12.5px] leading-6 text-white/75 sm:text-sm sm:leading-7 ${
              centered ? "mx-auto" : ""
            }`}
          >
            {description}
          </p>
        )}

        {children && <div className="mt-3.5">{children}</div>}
      </div>
    </section>
  );
}
