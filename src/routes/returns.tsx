import { createFileRoute } from "@tanstack/react-router";
import { TrustPageView } from "@/components/TrustPageView";
import { POLICY_META } from "@/data/policy-meta";

// العنوان/الوصف من `POLICY_META` (خفيف)، ونص الصفحة يُحمَّل عند فتحها فقط
// (`import()` داخل loader) حتى لا تدخل صفحات السياسات في المسار الحرج.
export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: POLICY_META.returns.title },
      { name: "description", content: POLICY_META.returns.description },
    ],
  }),
  loader: async () => {
    const { getPolicyPage } = await import("@/data/policy-pages");
    return { page: getPolicyPage("returns") };
  },
  component: PolicyRoute,
});

function PolicyRoute() {
  const { page } = Route.useLoaderData();
  return <TrustPageView page={page} whatsAppCta={false} />;
}
