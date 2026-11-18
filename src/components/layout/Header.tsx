import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  ShoppingCart,
  Menu,
  Download,
  X,
  Home,
  User,
  UserRound,
  Stethoscope,
  BookOpen,
  Info,
  MessageCircle,
  ChevronLeft,
  Search,
  HelpCircle,
  Heart,
  ScrollText,
} from "lucide-react";
import logoHeader from "@/assets/logo-mono.webp";
import logoSquare from "@/assets/logo-square.webp";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { waLink } from "@/lib/whatsapp";

const SearchBar = lazy(() =>
  import("@/components/SearchBar").then((module) => ({ default: module.SearchBar })),
);

type Icon = ComponentType<{ className?: string }>;
type NavTone = "primary" | "secondary" | "promo";
type NavItem = {
  label: string;
  icon: Icon;
  tone?: NavTone;
  badge?: string;
} & ({ to: string; href?: never } | { href: string; to?: never });

const desktopLinks = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/products/men", label: "منتجات الرجال", icon: User },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound },
  { to: "/products/devices", label: "الأجهزة الطبية", icon: Stethoscope },
  { to: "/education", label: "إرشادات المختصين", icon: BookOpen },
  { to: "/products/guides", label: "دليل الاختيار", icon: ScrollText },
  { to: "/contact", label: "تواصل معنا", icon: MessageCircle },
  { to: "/about", label: "من نحن", icon: Info },
] as const;

const shopLinks: NavItem[] = [
  { to: "/", label: "الرئيسية", icon: Home, tone: "secondary" },
  { to: "/products/men", label: "منتجات الرجال", icon: User, tone: "primary" },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound, tone: "primary" },
  { to: "/products/devices", label: "الأجهزة الطبية", icon: Stethoscope, tone: "primary" },
  { to: "/wishlist", label: "المفضلة", icon: Heart, tone: "promo" },
  { to: "/education", label: "إرشادات المختصين", icon: BookOpen, tone: "secondary" },
  { to: "/products/guides", label: "دليل الاختيار", icon: ScrollText, tone: "secondary" },
];

const supportLinks: NavItem[] = [
  { to: "/contact", label: "تواصل معنا", icon: MessageCircle, tone: "secondary" },
  { to: "/about", label: "من نحن", icon: Info, tone: "secondary" },
  { href: "/products/men#faq", label: "الأسئلة الشائعة", icon: HelpCircle, tone: "secondary" },
];

function iconToneClass(tone: NavTone = "secondary") {
  switch (tone) {
    case "primary":
      return "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground";
    case "promo":
      return "bg-[#fdf6e3] text-[#8a6a12] group-hover:bg-[#c8961e] group-hover:text-white";
    case "secondary":
    default:
      return "bg-primary/[0.07] text-primary group-hover:bg-primary group-hover:text-primary-foreground";
  }
}

function linkToneClass(tone: NavTone = "secondary") {
  switch (tone) {
    case "promo":
      return "hover:border-[#d4a017] hover:bg-[#fdf6e3] hover:text-[#8a6a12]";
    case "primary":
      return "hover:border-primary hover:bg-primary/5 hover:text-primary";
    case "secondary":
    default:
      return "hover:border-primary/30 hover:bg-accent/60 hover:text-primary";
  }
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { isInstallable, install } = usePwaInstall();

  useEffect(() => {
    let lastScrollPosition = window.scrollY;

    const handleScroll = () => {
      // Don't hide/show header while drawer or search is open
      if (open || searchOpen) return;

      const currentScrollY = window.scrollY;

      // Handle top bounce
      if (currentScrollY <= 0) {
        setIsVisible(true);
        lastScrollPosition = 0;
        return;
      }

      // Scrolling down
      if (currentScrollY > lastScrollPosition && currentScrollY > 60) {
        setIsVisible(false);
      }
      // Scrolling up
      else if (currentScrollY < lastScrollPosition) {
        setIsVisible(true);
      }

      lastScrollPosition = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open, searchOpen]);

  // Esc + lock body scroll عند فتح القائمة
  useEffect(() => {
    if (!open && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll without layout shift (scrollbar compensation)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, searchOpen]);

  // Ctrl/Cmd+K لفتح البحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 w-full border-b border-[#e6dcc0] bg-[#fffdf8]/95 backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full"} ${
          isVisible ? "shadow-[0_10px_30px_-26px_rgba(11,59,38,0.6)]" : ""
        }`}
      >
        {/* خيط ذهبي رقيق — نفس توقيع الرأس والفوتر */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#d4a017_22%,#c8961e_52%,transparent)] opacity-70"
        />
        {/* الشريط الرئيسي: القائمة يمين · اللوجو في المنتصف · الأيقونات يسار */}
        <div className="container mx-auto grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-16">
          {/* يمين — زر القائمة */}
          <div className="flex items-center justify-start">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/[0.07] lg:hidden"
              onClick={() => {
                setOpen((o) => !o);
                setIsVisible(true);
              }}
              aria-label="القائمة"
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* المنتصف — اللوجو */}
          <Link to="/" className="col-start-2 flex items-center justify-center">
            <img
              src={logoHeader}
              alt="الإخلاص ميديكال — شركة متخصصة في المنتجات الأصلية"
              className="h-11 w-auto object-contain md:h-12"
              width={250}
              height={94}
              // Keep the small brand mark below the home hero's high-priority LCP image.
              fetchPriority="low"
              decoding="async"
            />
          </Link>

          {/* يسار — البحث والمفضلة والسلة */}
          <div className="col-start-3 flex items-center justify-end gap-0.5 sm:gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-primary/[0.07] hover:text-primary"
              aria-label="بحث (Ctrl+K)"
              title="بحث (Ctrl+K)"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to="/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center text-[#c8961e] transition-smooth hover:text-[#8a6a12] sm:inline-flex"
              aria-label={wishlistCount > 0 ? `المفضلة، ${wishlistCount} منتجات` : "المفضلة"}
              title="المفضلة"
            >
              <Heart className="h-6 w-6" />
              {wishlistCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e0ae2a,#c8961e)] px-1 text-[10px] font-black text-[#04220f]"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center text-primary transition-smooth hover:text-primary/80"
              aria-label={count > 0 ? `السلة، ${count} منتجات` : "السلة"}
            >
              <ShoppingCart className="h-6 w-6" />
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* صف التنقّل — الشاشات الكبيرة فقط، في المنتصف */}
        <div className="hidden border-t border-[#efe6cf]/80 bg-[#fffdf8]/60 lg:block">
          <div className="container mx-auto flex h-11 items-center px-4">
            <nav
              className="mx-auto flex items-center justify-center gap-0.5"
              aria-label="القائمة الرئيسية"
            >
              {desktopLinks.map((l, i) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-full px-3 py-2 text-[13px] font-bold text-foreground/75 transition-colors hover:bg-primary/[0.06] hover:text-primary"
                  activeProps={{
                    className:
                      "rounded-full border border-[#e8d9a8] bg-[#fdf6e3] px-3 py-2 font-black text-[#8a6a12]",
                  }}
                >
                  {l.label}
                  {i < desktopLinks.length - 1 && <span className="sr-only"> · </span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer لمنع اختفاء المحتوى تحت الهيدر الثابت */}
      <div className="h-14 w-full shrink-0 md:h-16 lg:h-[6.875rem]" aria-hidden="true" />

      {/* Drawer للقائمة المنسدلة - جهة اليسار (مستقلة عن الهيدر) */}
      {open && (
        <div className="relative z-[100]">
          <div
            className="fixed inset-0 animate-in bg-black/50 backdrop-blur-sm duration-200 fade-in lg:hidden"
            onClick={closeMenu}
          />
          <div
            className="fixed inset-y-0 right-0 flex w-80 max-w-[88vw] animate-in flex-col overflow-y-auto overscroll-contain border-s border-[#e6dcc0] bg-[#fffdf8] shadow-2xl duration-300 slide-in-from-right lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
          >
            <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#032a17,#064e2b_60%,#0b6b3a)] px-4 py-3 text-white shadow-lg">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#d4a017_30%,#f5cf6b_55%,transparent)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#e8c86a]/25 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 left-6 h-24 w-24 rounded-full bg-emerald-400/35 blur-2xl"
              />

              {/* صف الهوية: اللوجو + الاسم + زر الإغلاق — الاسم بمساحة كاملة بدون قص */}
              <div className="relative flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-white/50">
                  <img
                    src={logoSquare}
                    alt="الإخلاص ميديكال"
                    width={256}
                    height={256}
                    className="h-8 w-8 object-contain"
                    decoding="async"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.14em] text-[#f5cf6b]/90">
                    <span aria-hidden="true" className="h-px w-3 bg-[#d4a017]" />
                    الصحة الزوجية بخصوصية كاملة
                  </span>
                  <div className="mt-1.5 whitespace-nowrap text-base font-black leading-tight">
                    الإخلاص ميديكال
                  </div>
                </div>
                <button
                  onClick={closeMenu}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-smooth hover:bg-white/25"
                  aria-label="إغلاق القائمة"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isInstallable && (
                <button
                  onClick={install}
                  className="relative mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white/12 text-[11px] font-black text-white ring-1 ring-white/20 transition-smooth hover:bg-white/20 active:scale-[0.99]"
                  title="تثبيت التطبيق"
                >
                  <Download className="h-3.5 w-3.5" />
                  تثبيت التطبيق على الشاشة الرئيسية
                </button>
              )}
            </div>

            <nav className="flex flex-col p-3" aria-label="روابط القائمة المختصرة">
              {shopLinks.map((item) => (
                <DrawerNavLink key={item.to ?? item.href} item={item} onNavigate={closeMenu} />
              ))}

              {/* تتبع طلبك */}
              <a
                href={waLink(
                  "مرحباً فريق الإخلاص ميديكال\nأريد الاستفسار عن حالة طلبي.\nشكراً لكم",
                )}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold text-foreground/80 transition-colors hover:border-primary/25 hover:bg-primary/[0.06] hover:text-primary"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.444l4.553-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.15 0-4.148-.675-5.79-1.823l-.415-.268-2.694.864.84-2.607-.29-.435A9.723 9.723 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z" />
                  </svg>
                </span>
                <span className="truncate">تتبع طلبك</span>
                <ChevronLeft className="h-4 w-4 shrink-0 opacity-35 transition-smooth group-hover:-translate-x-0.5 group-hover:opacity-100" />
              </a>

              <div className="my-2 h-px bg-border" />
              <div className="mb-2 px-2 text-[11px] font-black text-muted-foreground">
                الدعم والمعلومات
              </div>
              {supportLinks.map((item) => (
                <DrawerNavLink key={item.to ?? item.href} item={item} onNavigate={closeMenu} />
              ))}

              <a
                href={waLink("مرحباً، أريد استشارة مجانية من الإخلاص ميديكال")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#e0ae2a,#c8961e)] py-3 text-sm font-black text-[#04220f] shadow-sm transition-transform hover:scale-[1.01]"
              >
                <MessageCircle className="h-4 w-4" />
                استشارة مجانية عبر واتساب
              </a>
              <p className="mt-1.5 text-center text-[11px] font-bold text-muted-foreground">
                رد خلال دقائق
              </p>
            </nav>
          </div>
        </div>
      )}

      {/* Modal البحث */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex animate-in items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm duration-200 fade-in"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl animate-in duration-300 slide-in-from-top-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense
              fallback={
                <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-2xl">
                  جاري تحميل البحث…
                </div>
              }
            >
              <SearchBar onClose={() => setSearchOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const IconComponent = item.icon;
  const baseClass = `group flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold text-foreground/80 transition-colors ${linkToneClass(item.tone)}`;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-smooth ${iconToneClass(item.tone)}`}
        >
          <IconComponent className="h-[18px] w-[18px]" />
        </span>
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-[9px] font-black text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 opacity-35 transition-smooth group-hover:-translate-x-0.5 group-hover:opacity-100" />
    </>
  );

  if (item.href) {
    return (
      <a href={item.href} onClick={onNavigate} className={baseClass}>
        {content}
      </a>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={baseClass}
      activeProps={{ className: "border-[#e8d9a8] bg-[#fdf6e3] text-[#8a6a12]" }}
    >
      {content}
    </Link>
  );
}
