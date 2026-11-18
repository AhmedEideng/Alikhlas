import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, Headphones, ShieldCheck } from "lucide-react";
import { TrustPageView } from "@/components/TrustPageView";
import { POLICY_META } from "@/data/policy-meta";

// و HTML الزاحف)، ويُحمَّل عند فتح الصفحة فقط حتى لا يدخل المسار الحرج.
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: POLICY_META.about.title },
      { name: "description", content: POLICY_META.about.description },
    ],
  }),
  loader: async () => {
    const { aboutPage } = await import("@/data/about-content");
    return { page: aboutPage };
  },
  component: AboutPage,
});

const LINKS = [
  {
    to: "/medical-review-board" as const,
    icon: ShieldCheck,
    title: "شفافية المحتوى",
    text: "من يكتب المحتوى وكيف نتحقق منه",
  },
  {
    to: "/education" as const,
    icon: BookOpenCheck,
    title: "مكتبة التوعية",
    text: "مقالات وأدلة بمصادر مذكورة",
  },
  {
    to: "/contact" as const,
    icon: Headphones,
    title: "تواصل معنا",
    text: "واتساب مباشر قبل الطلب وبعده",
  },
];

function AboutPage() {
  const { page } = Route.useLoaderData();

  return (
    <>
      <TrustPageView page={page} wide />

      <section className="container mx-auto mb-10 grid max-w-5xl gap-4 px-4 md:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group rounded-2xl border bg-card p-5 text-center transition-all hover:border-primary/30"
          >
            <link.icon className="mx-auto mb-2 h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <h3 className="font-bold">{link.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{link.text}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
