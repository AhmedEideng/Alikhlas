import { Check } from "lucide-react";

/**
 * الثلاث لرفع الصفحات من «رقيقة» إلى محتوى حقيقي يُقرأ قبل الشراء.
 * الاتجاه مثبّت ltr داخل قسم عربي rtl، والهوية بصرية واحدة (زمردي + ذهبي).
 */
export interface EnEditorialSection {
  title?: string;
  paragraphs: string[];
  bullets?: string[];
}

export function EnEditorial({
  title,
  sections,
  columns = 2,
  id,
}: {
  title: string;
  sections: EnEditorialSection[];
  columns?: 1 | 2;
  id?: string;
}) {
  return (
    <section
      id={id}
      dir="ltr"
      lang="en"
      className="mt-10 rounded-[2rem] border border-[#e8d9a8]/70 bg-[linear-gradient(160deg,#ffffff,#fdf8ea_62%,#f7f2e2)] p-6 text-left shadow-[0_18px_40px_-34px_rgba(11,59,38,0.45)] md:p-9"
    >
      <h2 className="text-start text-2xl font-black leading-tight text-[#0b3b26] md:text-[1.7rem]">
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-2 mb-6 block h-[3px] w-14 rounded-full bg-[linear-gradient(90deg,#d4a017,#0b6b3a)]"
      />

      <div className={columns === 2 ? "grid gap-5 md:grid-cols-2" : "space-y-4"}>
        {sections.map((section, index) => (
          <article
            key={section.title ?? `section-${index}`}
            className="rounded-2xl border border-primary/12 bg-white/85 p-5 shadow-[0_16px_36px_-32px_rgba(11,59,38,0.5)]"
          >
            {section.title ? (
              <div className="mb-2.5 flex items-start gap-2.5">
                <span className="mt-px inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-[#e8d9a8] bg-[#fdf8ea] px-1.5 text-[11px] font-black text-[#8a6a12]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="m-0 text-start text-[15.5px] font-black leading-snug text-[#0b3b26]">
                  {section.title}
                </h3>
              </div>
            ) : null}

            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mb-3 text-start text-[13.5px] leading-7 text-[#3c4a44] last:mb-0"
              >
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="mt-3 space-y-2 border-t border-dashed border-primary/12 pt-3">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-start text-[13px] leading-6 text-[#3c4a44]"
                  >
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#0b6b3a]" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
