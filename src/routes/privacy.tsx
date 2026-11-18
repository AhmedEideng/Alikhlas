import { createFileRoute } from "@tanstack/react-router";
import { TrustPageView } from "@/components/TrustPageView";
import { POLICY_META } from "@/data/policy-meta";

// العنوان/الوصف من `POLICY_META` (خفيف)، ونص الصفحة يُحمَّل عند فتحها فقط
// (`import()` داخل loader) حتى لا تدخل صفحات السياسات في المسار الحرج.
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: POLICY_META.privacy.title },
      { name: "description", content: POLICY_META.privacy.description },
    ],
  }),
  loader: async () => {
    const { getPolicyPage } = await import("@/data/policy-pages");
    return { page: getPolicyPage("privacy") };
  },
  component: PolicyRoute,
});

function PolicyRoute() {
  const { page } = Route.useLoaderData();
  return <TrustPageView page={page} whatsAppCta={false} />;
}
