import { Link } from "@tanstack/react-router";
import { ShoppingCart, Heart, Star } from "lucide-react";
import type { ProductCardView } from "@/data/product-types";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { toast } from "sonner";
import { ProductCardImage } from "@/features/product/components/ProductCardImage";
import { getUseBadge } from "@/lib/product-badge";
import {
  trackSelectItem,
  trackCtaClick,
  trackAddToWishlist,
  trackRemoveFromWishlist,
} from "@/lib/analytics";

/**
 *
 *   1. خلفية كارت زرقاء/صفراء متدرّجة (`#f0f9ff → #fefce8`) لا علاقة لها بهوية
 *   2. شارة ملوّنة صلبة + زر سلة أيقوني صغير: لا يعرف الزائر ما سيحدث عند الضغط.
 *   3. ثلاث طبقات ألوان (شارة، سعر، زر) تتنافس بلا تسلسل بصري.
 *
 * الشكل الجديد (v3):
 *   - الكارت سطح واحد بلا حدود ثقيلة: إطار ذهبي رفيع (`ring`) + ظل طبقي ناعم،
 *     وخط ذهبي متدرّج يظهر على الحافة العلوية عند التحويم.
 *   - الصورة تاخد عرض الكارت بالكامل (نفس حافتها)، وشارة الاستخدام وزر المفضلة
 *     خرجوا من فوق الصورة إلى صف مستقل تحت الصورة — كانوا يغطّون شريط الهوية
 *     المطبوع داخل الصورة (اللوجو + شريحة التصنيف) فتبان مزدحمة.
 *   - فاصل ذهبي متدرّج رفيع قبل صف السعر بدل الخط المتقطّع (كان يوحي بفاتورة).
 *   - السعر رقم عريض + زر «أضف» زمردي متدرّج بحلقة ذهبية رفيعة (إجراء واضح
 *     وتسلسل بصري واحد: صورة ← عنوان ← سعر/إجراء).
 *   - لا سطر «شحن سري» داخل الكارت: معلومة الشحن لها صفحاتها الثابتة
 *     (`/shipping`) ورأس صفحة المنتج، وتكرارها في كل كارت كان حشوًا بصريًا.
 */

export function ProductCard({
  product,
  listName,
  priority = false,
}: {
  // ProductCardView الخفيفة، وصفحات الأقسام تمرّر Product الكامل بلا تغيير.
  product: ProductCardView;
  listName?: string;
  priority?: boolean;
}) {
  const { add } = useCart();
  const { has: hasInWishlist, toggle: toggleWishlist } = useWishlist();
  const useBadge = product.badgeLabel
    ? { label: product.badgeLabel, className: product.badgeClass ?? "" }
    : getUseBadge(product);
  const wishlisted = hasInWishlist(product.id);
  const showImage = Boolean(product.image);
  const effectiveListName = listName ?? "general_product_list";
  const outOfStock = product.stock <= 0;

  const trackSelect = () =>
    trackSelectItem(effectiveListName, {
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
    });

  return (
    <article
      className="product-card-deferred group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card shadow-[0_1px_2px_rgba(6,78,43,0.05),0_12px_30px_-26px_rgba(6,78,43,0.5)] ring-1 ring-[#efe4c6] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_52px_-32px_rgba(6,78,43,0.5)] hover:ring-gold/70"
      data-product-card={product.id}
    >
      {/* خط ذهبي رفيع يظهر عند التحويم — توقيع الهوية على البطاقة */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 z-20 h-px bg-[linear-gradient(90deg,transparent,#d4a017,transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {outOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.5rem] bg-background/70 backdrop-blur-[2px]">
          <span className="rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground">
            نفد المخزون
          </span>
        </div>
      )}

      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="block overflow-hidden"
        aria-label={`عرض تفاصيل ${product.name}`}
        onClick={trackSelect}
      >
        <div className="relative transition-transform duration-500 ease-out group-hover:scale-[1.03]">
          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute bottom-2.5 left-2.5 z-20 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black text-[#8a6a12] ring-1 ring-[#ecd9a4] backdrop-blur">
              باقي {product.stock}
            </span>
          )}
          {showImage ? (
            <ProductCardImage
              key={product.id}
              image={product.image}
              emoji={product.emoji}
              alt={product.name}
              productId={product.id}
              priority={priority}
            />
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center bg-gradient-soft text-7xl transition-all duration-700"
              aria-label={product.name}
            >
              {product.emoji}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        {/* صف الهوية: شارة الاستخدام + المفضلة — خارج الصورة عشان شريط الهوية
            المطبوع جواها (اللوجو + شريحة التصنيف) يفضل واضح. */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#fbf6e7] px-2.5 py-1 text-[10px] font-black text-[#8a6a12] ring-1 ring-[#ecd9a4]">
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${useBadge.className.split(" ")[0] ?? "bg-primary"}`}
            />
            <span className="truncate">{useBadge.label}</span>
          </span>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const wasAdded = !wishlisted;
              toggleWishlist(product);
              if (wasAdded) {
                trackAddToWishlist({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  qty: 1,
                });
                trackCtaClick("add_to_wishlist", effectiveListName, { product_id: product.id });
              } else {
                trackRemoveFromWishlist({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  qty: 1,
                });
              }
              toast.success(wasAdded ? "أضيف للمفضلة" : "أزيل من المفضلة", {
                duration: 1500,
                className: "rounded-2xl font-bold",
              });
            }}
            className={`group/heart inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-90 ${
              wishlisted
                ? "bg-[linear-gradient(135deg,#e0ae2a,#c8961e)] text-[#04220f] shadow-sm shadow-[#d4a017]/30 ring-1 ring-[#f0e3bd]"
                : "bg-white text-foreground/30 ring-1 ring-[#efe4c6] hover:text-[#c8961e] hover:ring-[#d4a017]/60"
            }`}
            aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            aria-pressed={wishlisted}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${wishlisted ? "fill-current scale-110" : "scale-100 group-hover/heart:scale-105"}`}
              strokeWidth={wishlisted ? 2.25 : 1.75}
            />
          </button>
        </div>

        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 min-h-[2.6em] text-center text-[13px] font-extrabold leading-[1.45] text-[#0e2a1d] transition-colors duration-300 group-hover:text-[#0b6b3a] sm:text-sm"
          onClick={trackSelect}
        >
          {product.name}
        </Link>

        {product.rating && product.reviews ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px]">
            <div className="flex items-center rounded-full bg-[#fbf6e7] px-2 py-0.5 font-black text-[#8a6a12] ring-1 ring-[#ecd9a4]">
              <Star className="mr-1 h-3 w-3 fill-[#d4a017] text-[#d4a017]" /> {product.rating}
            </div>
            <span className="font-medium text-muted-foreground">
              ({product.reviews} تقييم سابق)
            </span>
          </div>
        ) : null}

        <div className="mt-auto pt-3">
          {/* فاصل ذهبي متدرّج — بديل الخط المتقطّع اللي كان يوحي بفاتورة */}
          <span
            aria-hidden="true"
            className="mb-2.5 block h-px w-full bg-[linear-gradient(90deg,transparent,#e8d9a8_12%,#d4a017_50%,#e8d9a8_88%,transparent)]"
          />
          {/* (2026-11-19) على الموبايل السعر والزر كانوا في صف واحد أضيق من
              محتواهم، فزر «أضف» كان يُقص من حافة البطاقة. بقى الصف عموديًا
              تحت sm (زر بعرض كامل) وأفقي من sm وما فوق. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="whitespace-nowrap text-[16px] font-black tabular-nums tracking-tight text-[#0b6b3a] sm:text-[17px] lg:text-lg">
              {formatPrice(product.price)}
            </span>
            <button
              onClick={() => {
                if (outOfStock) return;
                trackCtaClick("add_to_cart", effectiveListName, { product_id: product.id });
                add(product);
                toast.success("تمت الإضافة للسلة", {
                  duration: 1500,
                  icon: <ShoppingCart className="h-4 w-4 text-primary" />,
                  className: "rounded-2xl font-bold",
                });
              }}
              disabled={outOfStock}
              className={`inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-black transition-all duration-300 active:scale-95 sm:w-auto sm:px-3.5 ${
                outOfStock
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-[linear-gradient(135deg,#0d7a43,#08522c)] text-white shadow-[0_8px_18px_-12px_rgba(6,78,43,0.9)] ring-1 ring-inset ring-[#d4a017]/45 hover:shadow-[0_10px_22px_-12px_rgba(6,78,43,0.95)] hover:brightness-[1.07]"
              }`}
              aria-label={outOfStock ? "نفد المخزون" : `أضف ${product.name} للسلة`}
            >
              <ShoppingCart className="size-4" />
              أضف
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
