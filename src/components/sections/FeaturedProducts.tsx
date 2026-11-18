import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { getFeaturedCards } from "@/data/product-cards";
import { useEffect, useMemo } from "react";
import { trackViewItemList } from "@/lib/analytics";

/**
 * «أبرز فئات العناية» و«تسوّق حسب الفئة» تحتها مباشرة.
 */
const HOME_FEATURED_VISIBLE = 4;

export function FeaturedProducts() {
  // البيانات محلية ثابتة — نحسبها مرة واحدة عبر useMemo.
  // لا حاجة لـ lazy loading أو effects هنا، فالحساب فوري ورخيص.
  const featured = useMemo(() => getFeaturedCards().slice(0, HOME_FEATURED_VISIBLE), []);

  useEffect(() => {
    if (featured.length > 0) {
      trackViewItemList(
        "featured_home",
        featured.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
  }, [featured]);

  return (
    <section
      id="featured-products"
      className="scroll-mt-24 bg-[linear-gradient(180deg,#fbfdfb,#ffffff)] py-7 md:py-9 lg:scroll-mt-32"
    >
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="اخترنا لك"
          title="أكثر ما يُطلب هذا الشهر"
          description="أربعة منتجات تغطي أكثر الاحتياجات تكرارًا في الطلبات — تُفتح صفحة كل واحد منها بمكوّناته وتحذيره قبل الشراء."
          action={{ label: "كل المنتجات", href: "/products/men" }}
        />
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} listName="featured_home" />
          ))}
        </div>
      </div>
    </section>
  );
}
