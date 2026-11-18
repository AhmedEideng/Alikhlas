import { createFileRoute } from "@tanstack/react-router";
import { TrustPageView } from "@/components/TrustPageView";
import { POLICY_META } from "@/data/policy-meta";

// العنوان/الوصف من `POLICY_META` (خفيف)، ونص الصفحة يُحمَّل عند فتحها فقط
// (`import()` داخل loader) حتى لا تدخل صفحات السياسات في المسار الحرج.
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: POLICY_META.contact.title },
      { name: "description", content: POLICY_META.contact.description },
    ],
  }),
  loader: async () => {
    const { getPolicyPage } = await import("@/data/policy-pages");
    return { page: getPolicyPage("contact") };
  },
  component: PolicyRoute,
});

function PolicyRoute() {
  const { page } = Route.useLoaderData();
  return (
    <TrustPageView
      page={page}
      whatsAppCta={"مرحبًا، لدي استفسار عن منتج في متجر الإخلاص ميديكال"}
    />
  );
}
