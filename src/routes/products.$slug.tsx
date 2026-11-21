import { useCheckoutFunnel } from "@/hooks/use-checkout-funnel";
import { getOrderAttempt, completeOrderAttempt } from "@/lib/order-attempt";
import { MAX_ORDER_UNITS } from "../../config/order-limits.js";
import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  AlertCircle,
  MessageCircle,
  X,
  BookOpen,
  Share2,
} from "lucide-react";
import { useFocusTrap } from "@/components/Accessibility";
import { formatPrice } from "@/data/product-types";
import { categoryBreadcrumbLabel } from "@/data/category-pages";
import {
  isPromotionEnabled,
  PROMO_MIN_THRESHOLD,
  PROMO_TIERS,
  PROMO_TITLE,
  getPromoTier,
} from "@/lib/promo";

// أصغر درجة (أول عتبة) — تُستخدم في سطر التعريف بالبرنامج أعلى صفحة المنتج.
const PROMO_MIN_THRESHOLD_TIER = PROMO_TIERS[PROMO_TIERS.length - 1];
import { useCart } from "@/hooks/use-cart";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { RecentlyViewed } from "@/components/sections/RecentlyViewed";
import { toast } from "sonner";
import {
  injectJsonLd,
  clearJsonLd,
  clearPrerenderJsonLd,
  productSchema,
  breadcrumbSchema,
  makeProductMetaDescription,
  makeProductMetaTitle,
} from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { CrossSellBundle } from "@/components/sections/CrossSellBundle";
import { FAQ } from "@/components/FAQ";
import { getProductFAQs } from "@/data/product-faqs";
import { CustomerReviews } from "@/features/product/components/CustomerReviews";
import { LegacyProductReviews } from "@/features/product/components/LegacyProductReviews";
import { VISIBLE_REVIEW_COUNT } from "@/lib/legacy-product-reviews";
import { ProductImage } from "@/features/product/components/ProductImage";
import { ProductHeader } from "@/components/product/ProductHeader";
import { buildOrderMessage, waLink } from "@/lib/whatsapp";
import { ShareButton } from "@/components/ShareButton";
import { TopicHub } from "@/components/TopicHub";
import { topicForProduct } from "@/data/topics";
import { shareProductText, waShareUrl } from "@/lib/share";
import { assetUrl } from "@/lib/cache";

// الأولى: `routeTree.gen.ts` يستورد كل المسارات مسبقًا، فأي استيراد ثابت هنا
// يسحب الكتالوج إلى المسار الحرج لكل صفحة. الاستيراد الديناميكي يبقيه حزمة
// منفصلة تُحمَّل عند فتح صفحة منتج فقط.
const loadCatalog = () => import("@/data/products");
// اللحظة، فلا تكلفة إضافية على أول رسم.
const loadRelated = () => import("@/lib/internal-links");

interface LinkedArticle {
  slug: string;
  title: string;
  emoji: string;
  readMin: number;
  image?: string;
}

import { isValidEgyptianPhone, sanitizeInput, normalizeEgyptianPhone } from "@/lib/utils";
import {
  EGYPT_GOVERNORATES,
  getShippingCost,
  submitToGoogleSheets,
  beaconOrderToSheets,
} from "@/lib/governorates";
import {
  trackCtaClick,
  trackOrderFailed,
  trackOrderSuccess,
  trackPurchase,
  trackShareClick,
  trackWhatsAppClick,
  trackViewItem,
  trackViewItemList,
} from "@/lib/analytics";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold">المنتج غير موجود</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  ),
  loader: async ({ params }) => {
    const [
      { getProductBySlug, getProductsByCategory, getCrossSellsForProduct },
      { relatedProductsFor },
    ] = await Promise.all([loadCatalog(), loadRelated()]);
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();

    const crossSells = getCrossSellsForProduct(product);

    // القسم: 52 صفحة من 89 تعرض نفس الـ4 (صفحة شوكولاتة توصي بجينسنغ)، و55
    // منتجًا بلا أي رابط داخل. المحرك يرتّب بالصلة (الشكل → السعر → عائلة
    // الاسم → ألقاب البحث) ويوازن التوزيع بين كل منتجات القسم.
    const related = relatedProductsFor(product, getProductsByCategory(product.category), {
      limit: 4,
      crossSellsOf: getCrossSellsForProduct,
    });

    return { product, related, crossSells };
  },
  head: ({ loaderData }) => {
    const SITE_URL = "https://alikhlasmedical.store";
    // Social previews must point at the same URL the prerendered HTML declares
    // (no cache-busting suffix), otherwise the initial document and the
    // hydrated DOM advertise two different og:image values.
    const absImg = loaderData?.product.image
      ? loaderData.product.image.startsWith("http")
        ? loaderData.product.image
        : `${SITE_URL}${loaderData.product.image}`
      : `${SITE_URL}/og-default.jpg`;
    return {
      meta: [
        {
          title: loaderData?.product
            ? makeProductMetaTitle(loaderData.product.name, 70, loaderData.product.titleLatin)
            : "المنتج",
        },
        {
          name: "description",
          content: loaderData?.product ? makeProductMetaDescription(loaderData.product) : "",
        },
        { property: "og:type", content: "product" },
        { property: "og:image", content: absImg },
        { name: "twitter:image", content: absImg },
      ],
    };
  },
});

function ProductPage() {
  const { product, related, crossSells } = Route.useLoaderData();
  const [linkedArticles, setLinkedArticles] = useState<LinkedArticle[]>([]);

  useEffect(() => {
    // Defer loading heavy articles to prevent blocking route transition & page paint
    let cancelled = false;
    // meta بس (بلا نصوص المقالات) — الكروت محتاجة 5 حقول بس
    Promise.all([import("@/lib/internal-links"), import("@/data/articles-meta.generated")]).then(
      ([{ getArticlesForProduct }, { articlesMeta: allArticles }]) => {
        if (cancelled) return;
        const articleSlugs = getArticlesForProduct(product);
        const matches = allArticles
          .filter((a) => articleSlugs.includes(a.slug))
          .map((a) => ({
            slug: a.slug,
            title: a.title,
            emoji: a.emoji,
            readMin: a.readMin,
            image: a.image,
          }));
        setLinkedArticles(matches);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [product]);

  const { add } = useCart();
  const { track: trackRecentlyViewed } = useRecentlyViewed();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [prevProductId, setPrevProductId] = useState(product.id);

  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setQty(1);
  }

  useScrollTracking(product.name);
  const [isOrdering, setIsOrdering] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
  });

  const quickSubtotal = product.price * qty;
  const quickTier = isPromotionEnabled() ? getPromoTier(quickSubtotal) : null;
  const quickDiscount = quickTier ? Math.round(quickSubtotal * quickTier.discount) : 0;
  const quickShipping = quickCustomer.governorate
    ? getShippingCost(quickCustomer.governorate, quickSubtotal)
    : 0;
  const funnel = useCheckoutFunnel(
    "quick_order",
    [{ id: product.id, name: product.name, price: product.price, qty }],
    quickSubtotal - quickDiscount + quickShipping,
    quickShipping,
    quickOrderOpen,
  );

  // ♿ Focus trap — يحبس Tab داخل النموذج ويعيد الفوكس عند الإغلاق
  const focusTrapRef = useFocusTrap<HTMLFormElement>(quickOrderOpen);

  useEffect(() => {
    trackRecentlyViewed(product);
  }, [product.id, trackRecentlyViewed, product]);

  // GA: view_item — كل زيارة لصفحة منتج (سعر من الكتالوج الرسمي)
  // + view_item_list للمنتجات المرتبطة (cross-sell)
  useEffect(() => {
    trackViewItem({ id: product.id, name: product.name, price: product.price, qty: 1 });
    if (related.length > 0) {
      trackViewItemList(
        `related_${product.id}`,
        related.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
    if (crossSells.length > 0) {
      trackViewItemList(
        `cross_sell_${product.id}`,
        crossSells.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
  }, [product.id, product.name, product.price, related, crossSells]);

  useEffect(() => {
    // أزل نسخ الـ prerender أولاً حتى لا يتكرر أي schema بعد الـ hydration
    clearPrerenderJsonLd();
    injectJsonLd(
      "product",
      productSchema({
        ...product,
        approvedReviewSummary:
          product.rating && product.reviews
            ? { ratingValue: product.rating, reviewCount: product.reviews }
            : undefined,
      }),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        {
          name: categoryBreadcrumbLabel(product.category),
          url:
            product.category === "men"
              ? "/products/men"
              : product.category === "women"
                ? "/products/women"
                : "/products/devices",
        },
        { name: product.name, url: `/products/${product.slug}` },
      ]),
    );
    return () => {
      clearJsonLd("product");
      clearJsonLd("breadcrumb");
    };
  }, [product]);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }
    trackCtaClick("add_to_cart", `/products/${product.slug}`, {
      product_id: product.id,
      qty,
    });
    add(product, qty);
    toast.success("تمت الإضافة للسلة بنجاح!", {
      duration: 1500,
      action: {
        label: "إتمام الطلب",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  };

  const handleWhatsAppOrder = () => {
    if (product.stock <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }
    trackCtaClick("quick_order_open", `/products/${product.slug}`, {
      product_id: product.id,
    });
    setQuickOrderOpen(true);
  };

  const submitQuickWhatsAppOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isOrdering) return;
    funnel.submit();
    if (qty > MAX_ORDER_UNITS) {
      toast.error(`الحد الأقصى للطلب ${MAX_ORDER_UNITS} وحدة`);
      return;
    }

    if (!quickCustomer.name || !quickCustomer.phone || !quickCustomer.governorate) {
      toast.error("اكتب الاسم ورقم الهاتف والمحافظة أولاً");
      return;
    }

    if (!isValidEgyptianPhone(quickCustomer.phone)) {
      toast.error("برجاء إدخال رقم هاتف صحيح، مصري أو دولي بصيغة +رمز الدولة");
      return;
    }

    setIsOrdering(true);
    let orderId: string | undefined;

    try {
      const sc = {
        name: sanitizeInput(quickCustomer.name, 100),
        phone: normalizeEgyptianPhone(quickCustomer.phone),
        governorate: sanitizeInput(quickCustomer.governorate, 50),
        address: quickCustomer.address ? sanitizeInput(quickCustomer.address, 200) : "",
      };

      const subtotal = product.price * qty;
      const tier = isPromotionEnabled() ? getPromoTier(subtotal) : null;
      const discount = tier ? Math.round(subtotal * tier.discount) : 0;
      const subtotalAfterDiscount = subtotal - discount;
      const shipping = getShippingCost(sc.governorate, subtotal);
      const grandTotal = subtotalAfterDiscount + shipping;
      const orderItems = [
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          qty,
          price: product.price,
          originalPrice: product.price,
        },
      ];

      const orderData = {
        orderType: "شراء فوري",
        paymentMethod: "واتساب",
        customerName: sc.name,
        customerPhone: sc.phone,
        governorate: sc.governorate,
        address: sc.address || "سيتم التأكيد على واتساب",
        notes: "طلب سريع من صفحة المنتج مباشرة",
        items: orderItems,
        subtotalBeforeDiscount: subtotal,
        discount,
        // شراء فوري = منتج واحد فقط → لا يمكن أن تكتمل أي باقة
        bundleDiscount: 0,
        subtotal: subtotalAfterDiscount,
        shipping,
        total: grandTotal,
      };

      orderId = await getOrderAttempt(orderData);
      const payload = { ...orderData, orderId };

      // GA: cta + begin_checkout — اتقدم الطلب
      trackCtaClick("quick_order_submit", `/products/${product.slug}`, {
        product_id: product.id,
        qty,
      });

      // بنستنى النتيجة الفعلية (مهلة 15 ثانية): نجاح → GA purchase +
      // (مفيش سلة هنا تمسح). فشل → beacon كمحاولة أخيرة + تحذير —
      // نص الطلب يوصلنا عبر رسالة واتساب نفسها (قناة مزدوجة) بس من
      // غير GA purchase (صدق الإيرادات).
      const submitResult = await submitToGoogleSheets(payload);
      if (submitResult.success) {
        completeOrderAttempt(orderId);
        // GA: purchase — سُجل فعلياً في الشيت
        trackPurchase(orderId, orderItems, grandTotal, shipping, discount);
        trackOrderSuccess(orderId, "whatsapp");
      } else {
        trackOrderFailed(orderId, "whatsapp");
        beaconOrderToSheets(payload); // محاولة أخيرة best-effort
        toast.error(
          "تعذر تسجيل الطلب آلياً، لكن طلبك أُرسل عبر واتساب. لو ما وصلك رد تأكيد خلال دقائق، تواصل معنا.",
          { duration: 8000 },
        );
      }

      try {
        // 🔒 لا نخزن رابط واتساب الكامل الذي يحتوي PII — رقم الطلب فقط
        sessionStorage.setItem("ikhlas_last_order_id", orderId);
        sessionStorage.removeItem("ikhlas_last_whatsapp_url");
      } catch {
        // Ignore storage failures.
      }

      setQuickOrderOpen(false);
      const quickWhatsAppUrl = waLink(
        buildOrderMessage(orderItems, sc, orderId, shipping, shipping === 0),
      );
      trackWhatsAppClick(quickWhatsAppUrl, "product_quick_order");
      window.location.assign(quickWhatsAppUrl);
    } catch (err) {
      if (orderId) trackOrderFailed(orderId, "whatsapp");
      console.error("Quick WhatsApp order error:", err);
      toast.error("حدث خطأ أثناء تجهيز الطلب، حاول مرة أخرى");
    } finally {
      setIsOrdering(false);
    }
  };

  const maxStock = Math.min(product.stock, MAX_ORDER_UNITS);
  const atStockLimit = qty >= maxStock;
  const categoryName = categoryBreadcrumbLabel(product.category);
  const categoryHref =
    product.category === "men"
      ? "/products/men"
      : product.category === "women"
        ? "/products/women"
        : "/products/devices";
  const topBenefits = product.benefits?.slice(0, 4) ?? [];

  return (
    <div className="container mx-auto px-4 py-6 pb-16 md:py-8 md:pb-8">
      <ProductHeader
        productName={product.name}
        productNameEn={product.nameEn}
        categoryName={categoryName}
        categoryHref={categoryHref}
        price={product.price}
        badge={product.badge}
        inStock={product.stock > 0}
        reviewsLabel={
          product.rating && product.reviews
            ? `${product.rating} من 5 (${product.reviews} تقييم سابق)`
            : undefined
        }
      />

      <section className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="rounded-[2rem] border border-[#e3ac21]/25 bg-card p-3 shadow-card ring-1 ring-primary/5">
          <ProductImage key={product.id} product={product} />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniFeature title="الجودة" value="تستحق ثقتك" />
            <MiniFeature title="الشحن" value="سري وسريع" />
            <MiniFeature title="الطلب" value="دفع عند الاستلام" />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-[#e8c473] bg-[linear-gradient(135deg,#fffaef,#ffffff_60%)] p-5 md:p-6">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-black text-[#0b3b26]">
              <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-[#e3ac21]" />
              عن المنتج
            </h2>
            <p
              dir="auto"
              className="whitespace-pre-line text-right text-[13.5px] leading-7 text-[#4a5a51] md:text-sm md:leading-8"
            >
              {product.description}
            </p>
          </div>

          {topBenefits.length > 0 && (
            <div className="rounded-[2rem] border border-primary/10 bg-card p-5 md:p-6">
              <h2 className="mb-3 text-[13px] font-black text-[#0b3b26]">أهم المزايا</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {topBenefits.map((benefit, index) => (
                  <li
                    key={`${product.id}-benefit-${index}`}
                    className="flex items-start gap-2 text-[12.5px] font-semibold leading-6 text-foreground/85"
                  >
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#e3ac21]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* (2026-11-16) كان كل المحتوى الطويل (وصف + مزايا + صناديق ثقة + مكونات)
          محشورًا داخل العمود الثاني، فيترك العمود الأول فراغًا أبيض بطول الشاشة.
          الآن: الطلب في العمودين فقط، وكل المعلومات في شبكة كاملة العرض تحته. */}
      {/* (2026-11-19) بعد حذف صندوق «قبل أن تدفع / كيف تصلك الشحنة؟» لم يبقَ
          في هذا الصف سوى عمود واحد، فأُزيل تقسيم العمودين لتفادي فراغ جانبي. */}
      <section className="mt-6 md:mt-8">
        <div className="space-y-5">
          {(product.ingredients || product.usage) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {product.ingredients && (
                <InfoBox title="المكونات / التركيبة" content={product.ingredients} />
              )}
              {product.usage && <InfoBox title="طريقة الاستخدام" content={product.usage} />}
            </div>
          )}
          {/* 🧾 (2026-11-16) لوحة «تفاصيل الطلب» انتقلت من أعلى الصفحة إلى
              ما بعد «طريقة الاستخدام» مباشرة (طلب المالك): الزائر يقرأ الوصف
              والاستخدام أولًا، ثم يجد السعر والكمية وأزرار الطلب في مكانها. */}
          <div className="rounded-[2rem] border border-primary/10 bg-card p-5 shadow-card md:p-7">
            <div className="grid gap-5 md:grid-cols-2 md:items-start">
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-dashed border-primary/15 pb-3">
                  <h2 className="text-sm font-black text-foreground/85">تفاصيل الطلب</h2>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {product.stock > 0 ? "جاهز للشحن اليوم" : "غير متوفر حالياً"}
                  </span>
                </div>

                {isPromotionEnabled() && (
                  <div className="mt-4 rounded-2xl border border-accent bg-accent/40 px-4 py-3 text-xs font-bold leading-6 text-primary sm:text-sm">
                    {PROMO_TITLE}: اصعد درجاتك، خصم يبدأ من{" "}
                    {PROMO_MIN_THRESHOLD_TIER ? PROMO_MIN_THRESHOLD_TIER.label : ""} عند{" "}
                    {formatPrice(PROMO_MIN_THRESHOLD)} ويصل إلى{" "}
                    {PROMO_TIERS[0] ? PROMO_TIERS[0].label : ""} عند الطلب من{" "}
                    {formatPrice(PROMO_TIERS[0] ? PROMO_TIERS[0].threshold : 0)} فأكثر
                  </div>
                )}

                {product.stock <= 5 && product.stock > 0 && (
                  <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    باقي {product.stock} فقط، اطلب الآن قبل نفاد الكمية
                  </div>
                )}
                {product.stock <= 0 && (
                  <div className="mt-4 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-bold">
                    هذا المنتج غير متوفر حالياً
                  </div>
                )}
              </div>
              <div>
                {product.stock > 0 && (
                  <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* (2026-09-16) حلقة الانتشار: مشاركة المنتج واتساب برسالة
                    جاهزة (اسم + سعر + لينك) — أقل مجهود ممكن للمشاركة */}
                      <ShareButton
                        text={shareProductText(
                          product.name,
                          product.price,
                          `/products/${product.slug}`,
                        )}
                        label="شارك المنتج"
                      />
                      <div className="flex items-center rounded-full border bg-muted/50 p-1 w-fit">
                        <button
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          aria-label={`تقليل كمية ${product.name}`}
                          className="h-10 w-10 inline-flex items-center justify-center rounded-full transition-smooth hover:bg-accent"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-black text-lg tabular-nums">
                          {qty}
                        </span>
                        <button
                          onClick={() => setQty(Math.min(qty + 1, maxStock))}
                          disabled={atStockLimit}
                          aria-label={`زيادة كمية ${product.name}`}
                          className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-smooth ${
                            atStockLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* (2026-11-16) الأزرار في سطر مستقل بعرض كامل: الأساسي زمردي
                  متدرّج، والثانوي أبيض بحدود ذهبية — هرمية واضحة بدل زرّين
                  أخضرين متساويين كانا يتزاحمان مع زر المشاركة والكمية. */}
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={handleAddToCart}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3.5 text-[15px] font-black text-primary-foreground shadow-[0_16px_36px_-28px_rgba(11,59,38,0.8)] transition-smooth hover:brightness-110"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        إضافة للسلة
                      </button>

                      <button
                        onClick={handleWhatsAppOrder}
                        disabled={isOrdering}
                        className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-[15px] font-black transition-smooth ${
                          isOrdering
                            ? "cursor-wait border-border bg-muted text-muted-foreground"
                            : "border-[#e3ac21]/45 bg-white text-[#0b3b26] hover:border-[#e3ac21] hover:bg-[#fffaef]"
                        }`}
                      >
                        <MessageCircle className="h-5 w-5 text-[#0b6b3a]" />
                        {isOrdering ? "جاري التحويل..." : "اطلب عبر واتساب"}
                      </button>
                    </div>

                    <p className="mt-3 rounded-2xl border border-[#eee3c6] bg-[#fdf9ee] px-4 py-3 text-center text-xs font-bold leading-6 text-[#6d6250]">
                      لطلب أكثر من منتج، استخدم إضافة للسلة ثم أتم الطلب مرة واحدة.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 محرك البيع المتقاطع — Cross Sell Bundle */}
      {crossSells.length > 0 && (
        <CrossSellBundle mainProduct={product} suggestedProducts={crossSells} />
      )}

      {/* ⭐ التقييمات الأرشيفية المستعادة من مراجعات عملاء سابقين */}
      {product.rating && product.reviews ? (
        <LegacyProductReviews
          rating={product.rating}
          reviewsCount={product.reviews}
          category={product.category}
          slug={product.slug}
          maxVisibleReviews={VISIBLE_REVIEW_COUNT}
        />
      ) : null}

      {/* 📝 المراجعات الجديدة المعتمدة فقط + نموذج المشاركة */}
      <CustomerReviews
        productId={product.id}
        maxVisibleReviews={product.rating && product.reviews ? 1 : 4}
      />

      {/* ── FAQ Section ── */}
      <FAQ items={getProductFAQs(product)} />

      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">منتجات قد تعجبك أيضاً</h2>
            <Link to={categoryHref} className="text-primary font-bold hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} listName={`related_${product.id}`} />
            ))}
          </div>
        </section>
      )}

      {/* 👀 شاهدتها مؤخراً — carousel من localStorage */}
      <RecentlyViewed currentSlug={product.slug} />

      {/* مقالات مرتبطة */}
      {linkedArticles && linkedArticles.length > 0 && (
        <section className="mt-6 mb-0 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="mb-4 text-xl font-black">مقالات تهمك</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {linkedArticles.map((a) => (
              <Link
                key={a.slug}
                to="/education/$slug"
                params={{ slug: a.slug }}
                className="flex flex-col rounded-2xl border bg-card hover:border-primary/30 transition-all group overflow-hidden shadow-sm hover:shadow-md"
              >
                {a.image ? (
                  <div className="h-32 w-full overflow-hidden bg-muted relative">
                    <img
                      src={a.image ? assetUrl(a.image) : undefined}
                      alt={a.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 right-3 text-2xl drop-shadow-md">
                      {a.emoji}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-muted/50 text-5xl">
                    {a.emoji}
                  </div>
                )}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground mt-auto pt-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {a.readMin} دقائق قراءة
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* (2026-09-17) Topic Authority: ربط المنتج بموضوعه (روابط صاعدة
          للـ pillar + مواضيع مرتبطة) — compact للمنتجات */}
      <TopicHub topic={topicForProduct(product.id)} isPillar={false} selfProductId={product.id} />

      {quickOrderOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="طلب سريع عبر واتساب"
          onClick={() => {
            if (!isOrdering) setQuickOrderOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isOrdering) setQuickOrderOpen(false);
          }}
        >
          <form
            ref={focusTrapRef}
            onSubmit={submitQuickWhatsAppOrder}
            onChangeCapture={funnel.start}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex rounded-full bg-[#25D366]/10 px-3 py-1 text-[11px] font-black text-[#128C3A]">
                  طلب سريع عبر واتساب
                </div>
                <h2 className="mt-3 text-xl font-black">اكتب بيانات التواصل</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  سنسجل الطلب أولاً ثم نفتح واتساب برسالة جاهزة لتأكيد التفاصيل.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickOrderOpen(false)}
                disabled={isOrdering}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-smooth hover:bg-accent disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-accent/20 p-3 text-xs font-bold leading-6 text-foreground/80">
              {product.name} × {qty}، {formatPrice(product.price * qty)} قبل الشحن/الخصم
            </div>

            <div className="mt-4 space-y-3">
              <QuickInput
                label="الاسم *"
                value={quickCustomer.name}
                onChange={(value) => setQuickCustomer((current) => ({ ...current, name: value }))}
                placeholder="اكتب اسمك"
                autoComplete="name"
              />
              <QuickInput
                label="رقم الهاتف *"
                value={quickCustomer.phone}
                onChange={(value) => {
                  setQuickCustomer((current) => ({ ...current, phone: value }));
                }}
                placeholder="01xxxxxxxxx"
                type="tel"
                maxLength={16}
                autoComplete="tel"
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">المحافظة *</span>
                <select
                  value={quickCustomer.governorate}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({ ...current, governorate: event.target.value }))
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                  required
                >
                  <option value="" disabled>
                    اختر المحافظة...
                  </option>
                  {EGYPT_GOVERNORATES.map((governorate) => (
                    <option key={governorate} value={governorate}>
                      {governorate}
                    </option>
                  ))}
                </select>
              </label>

              <QuickInput
                label="العنوان"
                value={quickCustomer.address}
                onChange={(value) =>
                  setQuickCustomer((current) => ({ ...current, address: value }))
                }
                placeholder="اكتب عنوانك بالتفصيل (اختياري)"
                autoComplete="street-address"
                required={false}
              />
            </div>

            <button
              type="submit"
              disabled={isOrdering}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b7a45] px-6 py-3.5 text-sm font-black text-white shadow-lg transition-smooth hover:bg-[#096b3c] disabled:cursor-wait disabled:opacity-70"
            >
              <MessageCircle className="h-5 w-5" />
              {isOrdering ? "جاري تسجيل الطلب..." : "تسجيل وفتح واتساب"}
            </button>
            <p className="mt-2 text-center text-[11px] font-bold text-muted-foreground">
              بياناتك تستخدم لتأكيد الطلب والتوصيل فقط.
            </p>
          </form>
        </div>
      )}

      {product.stock > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-3 py-3 shadow-2xl backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-[104px] rounded-2xl border border-primary/10 bg-accent px-3 py-2 text-center shadow-sm">
              <div className="text-[10px] font-bold text-muted-foreground">السعر</div>
              <div className="text-base font-black text-primary">{formatPrice(product.price)}</div>
            </div>
            {/* (2026-09-16) زر مشاركة للموبايل — الموبايل هو المنصة
                الأساسي لنشر منتجات النيتش ده واتساب */}
            <a
              href={waShareUrl(
                shareProductText(product.name, product.price, `/products/${product.slug}`),
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="مشاركة المنتج عبر واتساب"
              onClick={() => {
                trackShareClick("product", `/products/${product.slug}`);
                trackCtaClick("share_whatsapp", `/products/${product.slug}-mobile-bar`, {
                  product_id: product.id,
                });
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C3A] active:scale-[0.97]"
            >
              <Share2 className="h-5 w-5" />
            </a>
            <button
              onClick={() => {
                trackCtaClick("add_to_cart", `/products/${product.slug}-mobile-bar`, {
                  product_id: product.id,
                  qty,
                });
                handleAddToCart();
              }}
              className="flex-1 rounded-2xl bg-gradient-brand px-4 py-3.5 text-sm font-black text-primary-foreground shadow-lg active:scale-[0.98]"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                أضف للسلة لطلب أكثر من منتج
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 100,
  autoComplete,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
        required={required}
      />
    </label>
  );
}

function MiniFeature({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background px-3 py-3 text-center shadow-sm">
      <div className="text-[10px] font-bold text-muted-foreground">{title}</div>
      <div className="mt-1 text-xs font-black text-foreground">{value}</div>
    </div>
  );
}

function InfoBox({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,#fffdf8,#ffffff)] p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-black text-[#0b3b26]">{title}</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">{content}</p>
    </div>
  );
}
