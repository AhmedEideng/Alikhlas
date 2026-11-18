/**
 * 🏷️ ترويسة قسم موحّدة للصفحة الرئيسية.
 *
 * متباينة)، فيبدو المنزل كأقسام ملصوقة من قوالب مختلفة. هذه الترويسة تجمع:
 * كلمة تمهيدية ذهبية + عنوان + سطر وصف + خط ذهبي قصير + رابط «شوف الكل».
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  align?: "start" | "center";
}) {
  const centered = align === "center";

  return (
    <div className={`mb-6 ${centered ? "text-center" : ""}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a017]/35 bg-[#d4a017]/8 px-3 py-1 text-[11px] font-black tracking-wide text-[#8a6a12]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#d4a017]" />
        {eyebrow}
      </span>

      <h2 className="mt-2.5 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">
        {title}
      </h2>

      <span
        aria-hidden="true"
        className={`mt-2.5 block h-[3px] w-12 rounded-full bg-[linear-gradient(90deg,#d4a017,#0b6b3a)] ${
          centered ? "mx-auto" : ""
        }`}
      />

      {description ? (
        <p
          className={`mt-2.5 max-w-2xl text-sm leading-7 text-muted-foreground ${
            centered ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      ) : null}

      {action ? (
        <div className={`mt-3.5 flex ${centered ? "justify-center" : "justify-start"}`}>
          <a
            href={action.href}
            className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-xs font-black text-primary shadow-sm transition-colors hover:border-[#d4a017]/45 hover:text-[#8a6a12]"
          >
            {action.label}
            <span aria-hidden="true">←</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
