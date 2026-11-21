import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/sections/Hero";
import { AnniversaryPromo } from "@/components/sections/AnniversaryPromo";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { WhyUs } from "@/components/sections/WhyUs";
import { ShopByConcern } from "@/components/sections/ShopByConcern";
import { DailyAdvice } from "@/components/sections/DailyAdvice";
import { ArticlesGrid } from "@/components/sections/ArticlesGrid";
import { ProductsTabs } from "@/components/sections/ProductsTabs";
import { RecentlyViewed } from "@/components/sections/RecentlyViewed";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "شركة مصرية متخصصة في منتجات الصحة والسعادة الزوجية" },
      {
        name: "description",
        content:
          "متجر الصحة الزوجية في مصر: مكوّن واستخدام وتحذير مكتوب لكل منتج، أسعار معلنة بالجنيه، تغليف محايد بلا اسم منتج، دفع عند الاستلام، وشحن لكل المحافظات.",
      },
      { name: "robots", content: "index, follow" },
      // Open Graph
      {
        property: "og:title",
        content: "شركة مصرية متخصصة في منتجات الصحة والسعادة الزوجية",
      },
      {
        property: "og:description",
        content:
          "متجر الصحة الزوجية في مصر: مكوّن واستخدام وتحذير مكتوب لكل منتج، أسعار معلنة بالجنيه، تغليف محايد بلا اسم منتج، دفع عند الاستلام، وشحن لكل المحافظات.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      {/* 1. Hero — لفت الانتباه */}
      <SectionErrorBoundary name="Hero">
        <Hero />
      </SectionErrorBoundary>

      {/* 2. سلّم التوفير — توفير متدرّج واضح */}
      <SectionErrorBoundary name="AnniversaryPromo">
        <AnniversaryPromo />
      </SectionErrorBoundary>

      <div className="home-below-fold">
        {/* 3. شاهدتها مؤخراً — يظهر للعملاء العائدين لسرعة الشراء */}
        <SectionErrorBoundary name="RecentlyViewed">
          <div className="bg-muted/30">
            <RecentlyViewed />
          </div>
        </SectionErrorBoundary>

        {/* 4. المنتجات المختارة — 8 منتجات فقط بدلاً من 20 لسرعة التحميل وتخفيف الخيارات */}
        <SectionErrorBoundary name="FeaturedProducts">
          <div className="home-band-mint">
            <FeaturedProducts />
          </div>
        </SectionErrorBoundary>

        {/* 5. تسوق حسب الاحتياج — العميل يبحث عن حل لمشكلة */}
        <SectionErrorBoundary name="ShopByConcern">
          <ShopByConcern />
        </SectionErrorBoundary>

        {/* 6. ليه الإخلاص — الثقة قبل الشراء */}
        <SectionErrorBoundary name="WhyUs">
          <WhyUs />
        </SectionErrorBoundary>

        {/* 7. أقسام المنتجات (تبويبات) — لتخفيف التمرير الطويل على الموبايل */}
        <SectionErrorBoundary name="ProductsTabs">
          <div className="home-band-mint">
            <ProductsTabs />
          </div>
        </SectionErrorBoundary>

        {/* 8. نصيحة يومية — بناء سلطة الثقة */}
        <SectionErrorBoundary name="DailyAdvice">
          <DailyAdvice />
        </SectionErrorBoundary>

        {/* 9. مقالات — SEO ووعي */}
        <SectionErrorBoundary name="ArticlesGrid">
          <div className="home-band-cream">
            <ArticlesGrid />
          </div>
        </SectionErrorBoundary>
      </div>
    </>
  );
}
