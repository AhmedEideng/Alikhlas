import { useCheckoutFunnel } from "@/hooks/use-checkout-funnel";
import { getOrderAttempt, completeOrderAttempt } from "@/lib/order-attempt";
import { MAX_ORDER_UNITS } from "../../config/order-limits.js";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Package,
  CheckCircle,
  Loader2,
  ChevronDown,
  MapPin,
  Lock,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/data/product-types";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { isValidEgyptianPhone, sanitizeInput, normalizeEgyptianPhone } from "@/lib/utils";
import {
  EGYPT_GOVERNORATES,
  submitToGoogleSheets,
  beaconOrderToSheets,
  getShippingCost,
  getShippingLabel,
  FREE_SHIPPING_THRESHOLD,
  qualifiesForFreeShipping,
} from "@/lib/governorates";
import {
  trackCtaClick,
  trackOrderFailed,
  trackOrderSuccess,
  trackPurchase,
  trackViewCart,
  trackWhatsAppClick,
} from "@/lib/analytics";
import { toast } from "sonner";
import { getNextTier, PROMO_TAGLINE, isPromotionEnabled } from "@/lib/promo";
import { BUNDLE_DISCOUNT_PERCENT } from "@/lib/site-config";
import { assetUrl } from "@/lib/cache";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة التسوق — الإخلاص ميديكال" },
      {
        name: "description",
        content:
          "سلة التسوق الخاصة بك في الإخلاص ميديكال. أكمل طلبك بسهولة عبر واتساب أو طلب مباشر مع خصومات متدرجة.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: CartPage,
});

type OrderMethod = "whatsapp" | "direct";

function CartPage() {
  const {
    items,
    total,
    subtotalBeforeDiscount,
    discount,
    tier,
    bundleDiscount,
    appliedBundle,
    setQty,
    remove,
    clear,
    isStockLimitReached,
    syncCatalog,
  } = useCart();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
    notes: "",
  });
  const [method, setMethod] = useState<OrderMethod>("whatsapp");
  const [submitting, setSubmitting] = useState(false);

  // 🚚 حساب مصاريف الشحن حسب المحافظة المختارة مع دعم الشحن المجاني
  const freeShippingApplied = qualifiesForFreeShipping(subtotalBeforeDiscount);
  const shipping = customer.governorate
    ? getShippingCost(customer.governorate, subtotalBeforeDiscount)
    : 0;
  const grandTotal = total + shipping;
  const funnel = useCheckoutFunnel("cart", items, grandTotal, shipping, items.length > 0);

  // ☀️ شريحة الخصم التالية لتحفيز العميل على زيادة المشتريات
  // (يتوقف العرض عند اكتمال باقة — الخصم المطبق وقتها هو خصم الباقة فقط)
  const nextTier = appliedBundle ? null : getNextTier(subtotalBeforeDiscount);
  const amountToNext = nextTier ? nextTier.threshold - subtotalBeforeDiscount : 0;
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotalBeforeDiscount, 0);
  const promoLive = isPromotionEnabled();

  // مزامنة السلة بالكتالوج المعتمد (اسم/سعر/مخزون/صورة):
  // عند mount وعلى أي تغيير في العناصر (إضافة/حذف/تغيير كمية) —
  // items.length وحده لا يغطي تغيير الكمية في عنصر قائم.
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    void import("@/data/products").then(({ products }) => {
      if (!cancelled) syncCatalog(products);
    });
    return () => {
      cancelled = true;
    };
  }, [items, syncCatalog]);

  // GA4: view_cart — كل مرة السلة تتغير أو الصفحة تتفتح
  useEffect(() => {
    if (items.length > 0) {
      trackViewCart(
        items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total,
      );
    }
  }, [items, total]);

  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const overOrderLimit = totalUnits > MAX_ORDER_UNITS;

  const checkout = async () => {
    if (submitting) return;
    funnel.submit();
    if (overOrderLimit) {
      toast.error(`الحد الأقصى للطلب ${MAX_ORDER_UNITS} وحدة. قلّل الكمية ثم أعد المحاولة.`);
      return;
    }
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    const addressRequired = method === "direct";
    if (
      !customer.name ||
      !customer.phone ||
      !customer.governorate ||
      (addressRequired && !customer.address)
    ) {
      toast.error(
        method === "whatsapp"
          ? "يرجى كتابة الاسم ورقم الهاتف والمحافظة"
          : "يرجى ملء جميع الحقول المطلوبة (*)",
      );
      return;
    }
    if (!isValidEgyptianPhone(customer.phone)) {
      toast.error("برجاء إدخال رقم هاتف صحيح، مصري أو دولي بصيغة +رمز الدولة");
      return;
    }
    const overStock = items.find((i) => i.qty > i.stock);
    if (overStock) {
      toast.error(`الكمية المطلوبة لـ "${overStock.name}" تتجاوز المخزون`);
      return;
    }

    setSubmitting(true);
    const sc = {
      name: sanitizeInput(customer.name, 100),
      phone: normalizeEgyptianPhone(customer.phone),
      governorate: sanitizeInput(customer.governorate, 50),
      address: sanitizeInput(customer.address, 200),
      notes: customer.notes ? sanitizeInput(customer.notes, 300) : "",
    };

    // Split name for better Meta matching (first + last)

    const orderItems = items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      qty: i.qty,
      price: i.price,
      originalPrice: i.originalPrice,
    }));
    const orderData = {
      orderType: "cart",
      paymentMethod: method === "whatsapp" ? "واتساب" : "طلب مباشر",
      customerName: sc.name,
      customerPhone: sc.phone,
      governorate: sc.governorate,
      address: sc.address || "سيتم تأكيده على واتساب",
      notes: sc.notes,
      items: orderItems,
      subtotalBeforeDiscount,
      discount,
      // قيمة إرشادية — السيرفر يعيد حسابها من bundles-db.json ولا يثق بها
      bundleDiscount,
      subtotal: total,
      shipping,
      total: grandTotal,
    };

    const orderId = await getOrderAttempt(orderData);
    const payload = { ...orderData, orderId };

    // GA: cta + begin_checkout — اتقدم الطلب (مشاع للطريقتين)
    trackCtaClick(method === "whatsapp" ? "checkout_whatsapp" : "checkout_direct", "/cart", {
      items_count: items.length,
      value: grandTotal,
    });

    if (method === "whatsapp") {
      const msg = buildOrderMessage(
        orderItems,
        sc,
        orderId,
        shipping,
        freeShippingApplied,
        bundleDiscount,
      );
      const url = waLink(msg);

      try {
        // 🔒 لا نخزن رابط واتساب الكامل الذي يحتوي PII (اسم، هاتف، عنوان)
        // نخزن فقط رقم الطلب للمراجعة، بدون أي بيانات عميل
        sessionStorage.setItem("ikhlas_last_order_id", orderId);
        sessionStorage.removeItem("ikhlas_last_whatsapp_url");
      } catch {
        // Ignore storage failures.
      }

      // قبل البيانات" وليس "السيرفر استلم الطلب". بنستنى النتيجة الفعلية
      // (مهلة 15 ثانية) قبل أي قرار:
      //   نجاح → GA purchase + مسح السلة (الطلب موجود في الشيت فعلياً)
      //   فشل  → beacon كمحاولة أخيرة (الـ payload يفضل حي في المتصفح) +
      //          تحذير للعميل + نص الطلب يوصلنا برضه عبر رسالة واتساب
      //          نفسها (قناة مزدوجة) — بس من غير GA purchase (صدق الإيرادات)
      const submitResult = await submitToGoogleSheets(payload);
      if (submitResult.success) {
        completeOrderAttempt(orderId);
        // GA: purchase — سُجل فعلياً في الشيت
        trackPurchase(orderId, orderItems, grandTotal, shipping, discount + bundleDiscount);
        trackOrderSuccess(orderId, "whatsapp");
        clear();
      } else {
        trackOrderFailed(orderId, "whatsapp");
        beaconOrderToSheets(payload); // محاولة أخيرة best-effort
        toast.error(
          "تعذر تسجيل الطلب آلياً، لكن طلبك أُرسل عبر واتساب. لو ما وصلك رد تأكيد خلال دقائق، تواصل معنا.",
          { duration: 8000 },
        );
      }
      setSubmitting(false);
      trackWhatsAppClick(url, "cart_checkout");
      window.location.assign(url);
      return;
    } else {
      // (مهلة 15 ثانية) والزر يبقى في حالة submitting أثناء الانتظار.
      // نجاح → GA purchase + مسح السلة + صفحة التأكيد.
      // فشل  → السلة محفوظة لإعادة المحاولة + قناة بديلة (واتساب) —
      //         لا فقدان صامت ولا شاشة نجاح مضللة.
      const result = await submitToGoogleSheets(payload);

      try {
        sessionStorage.setItem("ikhlas_last_order_id", orderId);
      } catch {
        // Ignore storage failures.
      }

      if (result.success) {
        completeOrderAttempt(orderId);
        // GA: purchase — سُجل فعلياً في الشيت (فشل التسجيل = مفيش revenue)
        trackPurchase(orderId, orderItems, grandTotal, shipping, discount + bundleDiscount);
        trackOrderSuccess(orderId, "direct");
        // سُجل بنجاح → نطهر السلة (العميل رايح لصفحة التأكيد)
        clear();
        toast.success("تم استلام طلبك بنجاح", { duration: 2500 });
        navigate({ to: "/order-confirmed" });
      } else {
        trackOrderFailed(orderId, "direct");
        toast.error(
          "تعذر تسجيل طلبك آلياً. سلّتك محفوظة لإعادة المحاولة، أو أكمل طلبك الآن عبر واتساب.",
          {
            duration: 10000,
            action: {
              label: "الطلب عبر واتساب",
              onClick: () => {
                const msg = buildOrderMessage(
                  orderItems,
                  sc,
                  orderId,
                  shipping,
                  freeShippingApplied,
                  bundleDiscount,
                );
                const a = document.createElement("a");
                a.href = waLink(msg);
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                document.body.appendChild(a);
                trackWhatsAppClick(a.href, "checkout_fallback");
                a.click();
                a.remove();
              },
            },
          },
        );
      }
      setSubmitting(false);
    }
  };

  if (items.length === 0)
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-accent text-primary mb-4 mx-auto">
          <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">سلتك فارغة</h1>
        <Link
          to="/products/men"
          className="mt-6 inline-flex rounded-full bg-gradient-brand px-7 py-3 font-bold text-primary-foreground"
        >
          تسوق الآن
        </Link>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 overflow-x-hidden max-w-full">
      <div className="mb-6 md:mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e0c987] bg-[#fdf6e3] px-3 py-1 text-[11px] font-black text-[#8a6a12]">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
          خطوة واحدة وتخلص
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">سلة التسوق</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        الحد الأقصى للطلب {MAX_ORDER_UNITS} وحدة من جميع المنتجات.
      </p>
      {overOrderLimit && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive p-4 text-destructive">
          الحد الأقصى للطلب {MAX_ORDER_UNITS} وحدة. سلّتك تحتوي على {totalUnits} وحدة؛ قلّل الكمية
          لإكمال الطلب.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full">
        <div className="flex-1 lg:w-2/3 space-y-3 w-full max-w-full">
          {items.map((it) => {
            const atLimit = isStockLimitReached(it.id) || totalUnits >= MAX_ORDER_UNITS;
            return (
              <div
                key={it.id}
                className="w-full rounded-2xl border bg-card p-2.5 sm:p-4 transition-smooth"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-gold-soft bg-muted">
                      {it.image ? (
                        <img
                          src={it.image ? assetUrl(it.image) : undefined}
                          alt={it.name}
                          className="h-full w-full object-cover"
                          width={48}
                          height={48}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">
                          {it.emoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate max-w-full">{it.name}</div>
                      <div className="text-primary font-bold text-sm">{formatPrice(it.price)}</div>
                      {atLimit && (
                        <span className="text-[10px] text-amber-600 font-bold">
                          الحد الأقصى المتاح
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2.5 shrink-0">
                    <div className="flex items-center rounded-full border border-primary/15 bg-[#fffdf8]">
                      <button
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label={`تقليل كمية ${it.name}`}
                        className="p-1.5 hover:bg-accent rounded-r-full"
                      >
                        <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </button>
                      <span className="w-7 sm:w-6 text-center text-xs font-bold tabular-nums">
                        {it.qty}
                      </span>
                      <button
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label={`زيادة كمية ${it.name}`}
                        disabled={atLimit}
                        className={`p-1.5 rounded-l-full ${atLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"}`}
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      aria-label={`حذف ${it.name} من السلة`}
                      className="text-destructive p-2 hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 📦 بطاقة ضمان الخصوصية والتغليف الآمن بصفحة السلة — تبديد مخاوف الاستلام */}
          <div className="mt-4 rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,#f2f9f4,#ffffff)] p-4 text-right shadow-sm sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#e8d9a8] bg-white text-primary">
                <Lock className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-black text-[#0b3b26] sm:text-base">
                  تغليف سري ومحايد
                </h3>
                <p className="text-xs leading-6 text-[#4a5a51]">
                  يتم شحن جميع الطلبات داخل{" "}
                  <strong>صناديق كرتونية بنية أو أكياس معتمة محكمة الغلق تماماً</strong> بدون كتابة
                  اسم المنتجات من الخارج. يظهر اسم المرسل على البوليصة بصيغة عامة (شركة الإخلاص)
                  لخصوصية تامة مع مندوب التوصيل والآخرين.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="flex h-fit w-full max-w-full flex-col space-y-5 rounded-3xl border border-[#e6dcc0] bg-[linear-gradient(180deg,#fffdf8,#ffffff)] p-4 shadow-[0_18px_40px_-34px_rgba(11,59,38,0.55)] sm:p-6 lg:sticky lg:top-24 lg:w-1/3">
          {/* Order Summary (Moved to top as requested for better UX) */}
          <div className="order-1 space-y-2 border-b pb-5 mb-1">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black sm:text-xl">
              ملخص الطلب
            </h2>

            {/* ☀️ محفّز الترقية للشريحة التالية */}
            {promoLive && nextTier && amountToNext > 0 && (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 text-center mb-4">
                <p className="text-xs sm:text-sm text-amber-900 font-bold">
                  {nextTier.icon} أضف{" "}
                  <span className="text-amber-700 text-base">{formatPrice(amountToNext)}</span> فقط
                  لتحصل على خصم <span className="text-amber-700 text-base">{nextTier.label}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-amber-700/80 mt-1">{PROMO_TAGLINE}</p>
              </div>
            )}

            {customer.governorate && !freeShippingApplied && amountToFreeShipping > 0 && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-center">
                <p className="text-xs font-bold text-[#064e2b] sm:text-sm">
                  أضف{" "}
                  <span className="text-base text-primary">
                    {formatPrice(amountToFreeShipping)}
                  </span>{" "}
                  فقط لتحصل على شحن مجاني
                </p>
                <p className="mt-1 text-[10px] text-[#4a5a51]/85 sm:text-xs">
                  الشحن المجاني يُطبَّق تلقائياً من {formatPrice(FREE_SHIPPING_THRESHOLD)} فأكثر
                </p>
              </div>
            )}

            <div className="text-sm flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span
                className={discount > 0 ? "line-through text-muted-foreground" : "font-semibold"}
              >
                {formatPrice(subtotalBeforeDiscount) || "0 ج.م"}
              </span>
            </div>
            {discount > 0 && tier && (
              <>
                <div
                  className={`text-sm flex justify-between font-bold text-white rounded-lg px-3 py-2 bg-gradient-to-r ${tier.color}`}
                >
                  <span>
                    {tier.icon} {tier.name} (خصم {tier.label})
                  </span>
                  <span>-{formatPrice(discount) || "0 ج.م"}</span>
                </div>
              </>
            )}
            {bundleDiscount > 0 && appliedBundle && (
              <div className="text-sm flex justify-between font-bold text-emerald-800 rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-200">
                <span>خصم الباقة المكتملة ({BUNDLE_DISCOUNT_PERCENT}%)</span>
                <span>-{formatPrice(bundleDiscount) || "0 ج.م"}</span>
              </div>
            )}
            {(discount > 0 || bundleDiscount > 0) && (
              <div className="text-sm flex justify-between font-bold">
                <span>المجموع بعد الخصم</span>
                <span className="text-emerald-700">{formatPrice(total) || "0 ج.م"}</span>
              </div>
            )}
            {customer.governorate && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">
                  شحن — {getShippingLabel(customer.governorate)}
                </span>
                <span className={freeShippingApplied ? "font-bold text-emerald-700" : ""}>
                  {freeShippingApplied ? "مجاني" : formatPrice(shipping) || "0 ج.م"}
                </span>
              </div>
            )}
            <div className="text-base sm:text-lg font-bold flex justify-between pt-2 border-t mt-2">
              <span>الإجمالي</span>
              <span className="text-primary">{formatPrice(grandTotal) || "0 ج.م"}</span>
            </div>
          </div>

          {/* Form & Method Section */}
          <div className="order-2 space-y-5" onChangeCapture={funnel.start}>
            <h2 className="text-lg font-black sm:text-xl">بيانات التوصيل</h2>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-primary/10 bg-[#f6f9f7] p-1.5">
              <button
                onClick={() => setMethod("whatsapp")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all duration-300 ${method === "whatsapp" ? "bg-white text-primary shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:bg-white/60"}`}
              >
                <MessageCircle className="h-4 w-4" /> واتساب
              </button>
              <button
                onClick={() => setMethod("direct")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "direct" ? "bg-white text-primary shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:bg-white/60"}`}
              >
                <Package className="h-4 w-4" /> طلب مباشر
              </button>
            </div>
            <div className="rounded-xl border border-[#eee3c6] bg-[#fdf9ee] p-3 text-[11px] font-bold text-[#6d6250]">
              {method === "whatsapp"
                ? "سيُفتح واتساب برسالة جاهزة. أرسلها فقط لتأكيد الطلب."
                : "سيُرسل طلبك مباشرة. سنتواصل معك لتأكيد التفاصيل."}
            </div>
            <div className="space-y-3">
              <Inp
                label="الاسم *"
                placeholder="اكتب اسمك هنا"
                value={customer.name}
                onChange={(v) => setCustomer({ ...customer, name: v })}
                maxLength={100}
              />
              <Inp
                label="رقم الهاتف *"
                placeholder="01xxxxxxxxx"
                value={customer.phone}
                onChange={(v) => {
                  setCustomer({ ...customer, phone: v });
                }}
                type="tel"
                maxLength={16}
              />
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">
                  <MapPin className="h-3.5 w-3.5 inline-block mr-1" />
                  المحافظة *
                </span>
                <div className="relative">
                  <select
                    value={customer.governorate}
                    onChange={(e) => setCustomer({ ...customer, governorate: e.target.value })}
                    className="box-border w-full cursor-pointer appearance-none rounded-xl border border-[#e6dcc0] bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-[#d4a017] focus:ring-4 focus:ring-[#d4a017]/10"
                    required
                  >
                    <option value="" disabled>
                      اختر المحافظة...
                    </option>
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </label>
              <Inp
                label={method === "whatsapp" ? "العنوان (اختياري)" : "العنوان *"}
                placeholder={
                  method === "whatsapp"
                    ? "اختياري — يمكن تأكيده على واتساب"
                    : "المدينة، الشارع، رقم العمارة"
                }
                value={customer.address}
                onChange={(v) => setCustomer({ ...customer, address: v })}
                maxLength={200}
              />
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
                <textarea
                  value={customer.notes}
                  placeholder="أي تفاصيل أخرى..."
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  maxLength={300}
                  rows={2}
                  className="box-border w-full resize-none rounded-xl border border-[#e6dcc0] bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[#d4a017] focus:ring-4 focus:ring-[#d4a017]/10"
                />
              </label>
            </div>

            <button
              onClick={checkout}
              disabled={submitting || overOrderLimit}
              className={`w-full mt-6 rounded-full px-4 py-3.5 font-black text-white shadow-[0_16px_34px_-20px_rgba(11,59,38,0.75)] transition-all duration-300 active:scale-[0.98] sm:px-6 sm:py-4 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 text-sm sm:text-base ${method === "whatsapp" ? "bg-[linear-gradient(135deg,#0d7a43,#064e2b)] hover:brightness-105" : "bg-gradient-brand"}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : method === "whatsapp" ? (
                <>
                  <MessageCircle className="h-5 w-5" />
                  تأكيد عبر واتساب
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  تأكيد الطلب المباشر
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Inp({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="box-border w-full rounded-xl border border-[#e6dcc0] bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-[#d4a017] focus:ring-4 focus:ring-[#d4a017]/10"
      />
    </label>
  );
}
