import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Languages } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { EnEditorial } from "@/components/EnEditorial";
import {
  applyHreflang,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  injectJsonLd,
} from "@/lib/seo";
import { alternatesFor, enCategories, enHome } from "@/data/en-pages";

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title: enHome.title },
      { name: "description", content: enHome.description },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: EnHubPage,
});

/**
 * + روابط الفئات الثلاث الإنجليزية. الـ JSON-LD مطابق لنسخة الـ prerender.
 */
function EnHubPage() {
  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd("breadcrumb", breadcrumbSchema([{ name: "Home", url: "/en" }]));
    applyHreflang(alternatesFor("/en"));
    return () => {
      clearJsonLd("breadcrumb");
    };
  }, []);

  return (
    <div dir="ltr" lang="en" className="container mx-auto px-4 py-6 text-left md:py-8">
      <PageHero eyebrow="Al Ikhlas Medical" title={enHome.h1} description={enHome.intro} />
      <p className="mb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-[12.5px] font-black text-primary transition-colors hover:border-[#e3ac21]/60 hover:bg-[#fffaef]"
        >
          <Languages className="h-3.5 w-3.5" aria-hidden />
          {enHome.switchLabel}
        </Link>
      </p>
      <EnEditorial
        columns={1}
        title={enHome.storyTitle}
        sections={[{ paragraphs: enHome.story }]}
      />

      <h2 className="mb-4 mt-10 text-2xl font-extrabold">{enHome.browseLabel}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enCategories.map((c) => (
          <li key={c.path} className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
            <Link to={c.path} className="font-bold text-primary hover:underline">
              {c.heroTitle}
            </Link>
            <p className="mt-1 text-sm text-gray-600">{c.heroDescription}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-gray-600">
        {enHome.noteLabel}{" "}
        <Link to="/" className="font-bold text-primary hover:underline">
          النسخة العربية
        </Link>
      </p>
    </div>
  );
}
