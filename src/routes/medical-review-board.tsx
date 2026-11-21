import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpenCheck, Info } from "lucide-react";
import { TrustPageView } from "@/components/TrustPageView";
import { POLICY_META } from "@/data/policy-meta";

// الصفحة فقط حتى لا يدخل المسار الحرج.
export const Route = createFileRoute("/medical-review-board")({
  head: () => ({
    meta: [
      { title: POLICY_META["medical-review-board"].title },
      { name: "description", content: POLICY_META["medical-review-board"].description },
    ],
  }),
  loader: async () => {
    const { reviewBoardPage } = await import("@/data/review-board-content");
    return { page: reviewBoardPage };
  },
  component: ReviewBoardPage,
});

function ReviewBoardPage() {
  const { page } = Route.useLoaderData();

  return (
    <>
      <TrustPageView page={page} whatsAppCta="لدي ملاحظة على محتوى صفحة في الموقع" wide />

      <section className="container mx-auto mb-10 max-w-5xl px-4">
        <div className="rounded-2xl border border-[#e3ac21]/35 bg-[linear-gradient(135deg,#fffaef,#ffffff)] p-5">
          <p className="flex items-start gap-2 text-sm leading-7 text-foreground/85">
            <Info className="mt-1 h-4 w-4 shrink-0 text-[#8f6508]" />
            هذه الصفحة تخص المحتوى التحريري فقط. أي سؤال عن حالة صحية شخصية مكانه الطبيب المختص،
            وليس محادثة المتجر.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            to="/about"
            className="group flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/30"
          >
            <span className="text-sm font-bold">من نحن وما نلتزم به</span>
            <ArrowLeft className="h-4 w-4 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>
          <Link
            to="/education"
            className="group flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/30"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <BookOpenCheck className="h-4 w-4 text-primary" />
              مكتبة المقالات والأدلة
            </span>
            <ArrowLeft className="h-4 w-4 text-primary transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
