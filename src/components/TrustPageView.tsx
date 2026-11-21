import { Fragment, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
  Heart,
  Lock,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Star,
  Truck,
  Users,
  type LucideProps,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  formatPolicyDate,
  policySegments,
  policyText,
  type TrustIconName,
  type TrustPage,
} from "@/lib/policy-format";
import { waLink } from "@/lib/whatsapp";

/**
 * عارض موحّد للصفحات التحريرية: السياسات الخمس + «من نحن» + «شفافية المحتوى».
 *
 * النص كله يأتي من ملفات البيانات (`policy-pages` / `about-content` /
 * `review-board-content`) — نفس المصادر التي تبني HTML الزاحف في
 * `scripts/prerender-seo.mjs`، فلا تتباعد نسختان مرة أخرى.
 */
const ICONS: Record<TrustIconName, ComponentType<LucideProps>> = {
  alert: AlertTriangle,
  award: Award,
  book: BookOpenCheck,
  check: CheckCircle2,
  clock: Clock,
  globe: Globe,
  headphones: Headphones,
  heart: Heart,
  lock: Lock,
  package: Package,
  search: Search,
  shield: ShieldCheck,
  star: Star,
  truck: Truck,
  users: Users,
};

function RichText({ text }: { text: string }) {
  const segments = policySegments(text);

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <Fragment key={index}>{segment.value}</Fragment>
        ) : (
          <Link
            key={index}
            to={segment.path}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {segment.label}
          </Link>
        ),
      )}
    </>
  );
}

interface TrustPageViewProps {
  page: TrustPage;
  /** زر واتساب في النهاية — يُستخدم في صفحات التواصل والسياسات. */
  whatsAppCta?: string | false;
  /** أقصى عرض للمحتوى (الصفحات التحريرية أوسع). */
  wide?: boolean;
}

export function TrustPageView({ page, whatsAppCta, wide = false }: TrustPageViewProps) {
  return (
    <div className={`container mx-auto px-4 py-6 md:py-8 ${wide ? "max-w-5xl" : "max-w-4xl"}`}>
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        description={policyText(page.heroDescription)}
      />

      {page.stats?.length ? (
        <section className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
          {page.stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border bg-card p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-primary">{stat.value}</div>
              <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </section>
      ) : null}

      <article className="prose prose-lg mx-auto mt-6 max-w-3xl text-foreground">
        {page.updatedAt ? (
          <p className="text-sm font-semibold text-muted-foreground">
            آخر تحديث للصفحة: {formatPolicyDate(page.updatedAt)}
          </p>
        ) : null}

        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 mt-8 text-2xl font-bold">{section.heading}</h2>

            {section.intro ? (
              <p className="text-base font-semibold text-muted-foreground">
                <RichText text={section.intro} />
              </p>
            ) : null}

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>
                <RichText text={paragraph} />
              </p>
            ))}

            {section.bullets?.length ? (
              <ul className="my-4 list-disc space-y-2 pe-6">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>
                    <RichText text={bullet} />
                  </li>
                ))}
              </ul>
            ) : null}

            {section.cards?.length ? (
              <div className="not-prose my-5 grid gap-3 md:grid-cols-2">
                {section.cards.map((card) => {
                  const Icon = card.icon ? ICONS[card.icon] : null;
                  return (
                    <div
                      key={card.title}
                      className="flex items-start gap-3 rounded-2xl border bg-card p-4"
                    >
                      {Icon ? (
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                      ) : null}
                      <div>
                        <h3 className="text-sm font-black text-foreground">{card.title}</h3>
                        {card.meta ? (
                          <p className="text-[11px] font-bold text-[#8f6508]">{card.meta}</p>
                        ) : null}
                        <p className="mt-1 text-sm leading-7 text-muted-foreground">
                          <RichText text={card.text} />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </article>

      {whatsAppCta ? (
        <div className="mx-auto mt-8 max-w-3xl">
          <a
            href={waLink(whatsAppCta)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl bg-[#128c4b] px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-[#0f7a41]"
          >
            <MessageCircle className="h-6 w-6" />
            ابدأ محادثة على واتساب
          </a>
        </div>
      ) : null}
    </div>
  );
}
