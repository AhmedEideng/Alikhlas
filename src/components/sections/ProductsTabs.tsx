import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/sections/SectionHeading";
import {
  getCardsByCategory as getProductsByCategory,
  getHomepageTabCards,
} from "@/data/product-cards";
import { ArrowLeft, User, Heart, Activity } from "lucide-react";
import { trackViewItemList } from "@/lib/analytics";

const TAB_DEFS = [
  { key: "men", label: "للرجال", icon: User },
  { key: "women", label: "للنساء", icon: Heart },
  { key: "devices", label: "أجهزة طبية", icon: Activity },
] as const;

type TabKey = (typeof TAB_DEFS)[number]["key"];

export function ProductsTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("men");

  // أعداد المنتجات في كل قسم — تُقرأ من الكتالوج ولا تُكتب يدويًا.
  const TABS = useMemo(
    () => TAB_DEFS.map((tab) => ({ ...tab, count: getProductsByCategory(tab.key).length })),
    [],
  );

  // (2026-11-19) الاختيار لم يبقَ «أرخص 4 متبقية»: صار قائمة محرَّرة بالجودة
  // والتنوّع (HOMEPAGE_TAB_PICKS) تتجنّب ما ظهر في «الأكثر طلبًا» و«حدّد
  // احتياجك»، وتُكمل تلقائيًا من ترتيب القسم لو احتاج الأمر.
  const products = useMemo(() => getHomepageTabCards(activeTab), [activeTab]);

  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(
        `home_tab_${activeTab}`,
        products.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
  }, [products, activeTab]);

  return (
    <section className="bg-white py-8 md:py-10">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="ثلاث فئات"
          title="كل احتياج وله قسمه"
          description="افتح الفئة، قارن المكونات وطريقة الاستخدام، واختار اللي يناسبك في دقيقة."
          align="center"
        />

        {/* تبويبات الأقسام — مقطع واحد (segmented control) بهوية ذهبية: الأيقونة
            والعدد داخل كل تبويب، والنشِط ورقة بيضاء بحدّ ذهبي بدل حبّة زمردية
            مصمتة كانت تتنافس مع أزرار المنتجات. */}
        <div className="mb-7 flex justify-center">
          <div
            role="tablist"
            aria-label="أقسام المنتجات"
            className="flex w-full max-w-xl items-center gap-1 rounded-full border border-[#f7ebc4] bg-[#fff9ee] p-1.5 shadow-[0_12px_26px_-24px_rgba(6,78,43,0.9)] sm:w-auto"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2.5 text-[12px] font-black transition-all duration-300 sm:flex-none sm:gap-2 sm:px-4 sm:text-[12.5px] ${
                    active
                      ? "bg-white text-[#0b6b3a] shadow-[0_10px_20px_-14px_rgba(6,78,43,0.8)] ring-1 ring-[#e3ac21]/50"
                      : "text-[#7a6a4c] hover:text-[#8f6508]"
                  }`}
                >
                  <tab.icon
                    aria-hidden="true"
                    className={`size-4 shrink-0 ${active ? "text-[#e9b62c]" : "text-[#b9a675]"}`}
                    strokeWidth={2}
                  />
                  {tab.label}
                  <span
                    className={`hidden rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:inline-block ${
                      active
                        ? "bg-[#0b6b3a]/10 text-[#0b6b3a]"
                        : "bg-white/80 text-[#8f6508] ring-1 ring-[#e8cd8a]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} listName={`home_tab_${activeTab}`} />
          ))}
        </div>

        {/* View All Button — نمط واحد لكل التبويبات (كان يغيّر لونه مع القسم) */}
        <div className="mt-7 flex justify-center">
          <Link
            to={`/products/${activeTab}`}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0d7a43,#08522c)] px-7 py-3 text-[13px] font-black text-white shadow-[0_18px_34px_-24px_rgba(6,78,43,0.95)] ring-1 ring-inset ring-[#e3ac21]/45 transition-all duration-300 hover:brightness-[1.06] sm:text-sm"
          >
            عرض كل منتجات القسم
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
