import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Stethoscope,
  Tag,
  Truck,
  User,
  UserRound,
} from "lucide-react";
import logo from "@/assets/logo-square.webp";
import { COMPANY, waLink } from "@/lib/whatsapp";
import { PROMO_TIERS, PROMO_TITLE } from "@/lib/promo";

/**
 *
 * - خلفية زمردية غامقة واحدة (`#062b1a`) بخط ذهبي رقيق أعلى + نقشة نقاط،
 *   بدل التدرّج الأخضر الفاتح ذي الأعمدة الثلاثة المتماثلة.
 * - صف «سلّم التوفير» بأدراجه الثلاث (١٠٪ / ١٥٪ / ٢٠٪) بدل بانر عرض واحد.
 * - أربعة أعمدة مفصولة بخطوط شعر رأسية على الديسكتوب، وعمودان على الجوال.
 * - شريط ثقة موحّد (توصيل / تغليف محايد / دفع عند الاستلام) بنفس لغة الرأس.
 * - شريط سفلي: الحقوق + شفافية المحتوى (رابط مطلوب للاختبارات والسيو).
 */

const shopLinks = [
  { to: "/products/men", label: "منتجات الرجال", icon: User },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound },
  { to: "/products/devices", label: "الأجهزة الطبية", icon: Stethoscope },
  { to: "/products/guides", label: "دليل الاختيار", icon: BookOpen },
  { to: "/products/prices", label: "كل الأسعار", icon: Tag },
] as const;

const supportLinks = [
  { to: "/shipping", label: "الشحن والتوصيل" },
  { to: "/returns", label: "الاستبدال والاسترجاع" },
  { to: "/contact", label: "تواصل معنا" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/terms", label: "الشروط والأحكام" },
  { to: "/en", label: "English" },
] as const;

const trustRow = [
  { icon: Truck, label: "توصيل ٢٤-٧٢ ساعة" },
  { icon: Lock, label: "تغليف محايد بدون علامة" },
  { icon: CreditCard, label: "دفع عند الاستلام" },
] as const;

export function Footer() {
  const ladder = [...PROMO_TIERS].reverse(); // 1000 ← 1500 ← 2000

  return (
    <footer className="relative isolate mt-0 overflow-hidden bg-[#062b1a] text-white">
      {/* خط ذهبي أعلى الفوتر + نقشة نقاط (نفس توقيع الرأس) */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#8f6508_20%,#e3ac21_50%,#8f6508_80%,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(212,160,23,0.4)_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* ── سلّم التوفير (صف واحد) ── */}
      <div className="relative border-b border-white/10">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e3ac21]/40 bg-[#e3ac21]/12 text-[#f6e6b8]"
            >
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold text-[#e6cf8f]/80">
                كل ما سلّتك تكبر.. نسبتك تزيد
              </div>
              <div className="text-sm font-black">
                {PROMO_TITLE}: خصم حتى {PROMO_TIERS[0] ? PROMO_TIERS[0].label : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ladder.map((tier) => (
              <span
                key={tier.threshold}
                className="inline-flex items-center gap-1 rounded-full border border-[#e3ac21]/30 bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-black text-[#f6e6b8]"
              >
                <span className="tabular-nums">{tier.threshold} ج.م</span>
                <span aria-hidden className="text-[#d4a017]">
                  ←
                </span>
                <span>{tier.label}</span>
              </span>
            ))}
          </div>

          <a
            href={waLink(`مرحبًا، عايز أستفيد من ${PROMO_TITLE}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#f0c23a,#e9b62c)] px-4 py-2 text-[11.5px] font-black text-[#04220f] transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            ابدأ الآن
          </a>
        </div>
      </div>

      {/* ── الأعمدة ── */}
      <div className="relative container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-[1.5fr_0.85fr_0.85fr_1.1fr] lg:gap-0">
          {/* 1) البراند */}
          <div className="col-span-2 space-y-3 lg:col-span-1 lg:pe-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src={logo}
                alt="الإخلاص"
                width={200}
                height={200}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-xl bg-white p-1 object-contain ring-1 ring-[#e3ac21]/40"
              />
              <span>
                <span className="block text-base font-black leading-tight">{COMPANY.name}</span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4a017]">
                  {COMPANY.nameEn}
                </span>
              </span>
            </Link>
            <p className="max-w-xs text-[11.5px] leading-6 text-white/70">
              حلول أصلية للصحة والسعادة الزوجية في مصر، كتالوج مختار بعناية، شحن سري لكل المحافظات،
              وتغليف محايد يحمي خصوصيتك.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={waLink("مرحباً")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/85 transition-colors hover:border-[#e3ac21]/60 hover:text-[#f6e6b8]"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                واتساب
              </a>
              <a
                href={`mailto:${COMPANY.email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/85 transition-colors hover:border-[#e3ac21]/60 hover:text-[#f6e6b8]"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                راسلنا
              </a>
            </div>
          </div>

          {/* 2) الأقسام */}
          <nav aria-label="أقسام المتجر" className="lg:border-s lg:border-white/10 lg:px-6">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#d4a017]">
              تسوّق
            </h2>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group inline-flex items-center gap-1.5 text-[12.5px] text-white/80 transition-colors hover:text-[#f6e6b8]"
                  >
                    <link.icon className="h-3.5 w-3.5 text-[#d4a017]" aria-hidden />
                    {link.label}
                    <ArrowUpRight
                      aria-hidden
                      className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3) المساعدة */}
          <nav aria-label="المساعدة والسياسات" className="lg:border-s lg:border-white/10 lg:px-6">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#d4a017]">
              المساعدة
            </h2>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block text-[12.5px] text-white/80 transition-colors hover:text-[#f6e6b8]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 4) التواصل */}
          <div className="col-span-2 lg:col-span-1 lg:border-s lg:border-white/10 lg:ps-6">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#d4a017]">
              تواصل معنا
            </h2>
            <ul className="space-y-2 text-[12px]">
              <li className="flex items-center gap-2 text-white/80">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#d4a017]" aria-hidden />
                <a href={`mailto:${COMPANY.email}`} className="break-all hover:text-[#f6e6b8]">
                  {COMPANY.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4a017]" aria-hidden />
                <span className="leading-5">{COMPANY.address}</span>
              </li>
            </ul>

            <div className="mt-3 rounded-xl border border-[#e3ac21]/25 bg-white/[0.05] p-3 text-[11px] leading-5 text-white/80">
              <strong className="text-white/95">خصوصيتك أولًا:</strong> الشحنة توصل في عبوة مغلقة
              بدون اسم المنتج أو أي علامة تدل على المحتوى.
            </div>
          </div>
        </div>

        {/* شريط الثقة */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] font-bold text-white/70">
          {trustRow.map((item, index) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <item.icon className="h-3.5 w-3.5 text-[#d4a017]" aria-hidden />
              {item.label}
              {index < trustRow.length - 1 ? (
                <span aria-hidden className="ms-3 text-white/20">
                  •
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      {/* ── الشريط السفلي ── */}
      <div className="relative border-t border-white/10 bg-black/20">
        <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-3.5 text-center md:flex-row md:justify-between md:text-right">
          <p className="text-[10.5px] text-white/55">
            © {new Date().getFullYear()} {COMPANY.name} · جميع الحقوق محفوظة
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px]">
            <Link
              to="/medical-review-board"
              className="text-white/55 transition-colors hover:text-[#f6e6b8]"
            >
              شفافية المحتوى والمسؤولية التحريرية
            </Link>
            <span aria-hidden className="text-white/20">
              •
            </span>
            <span className="text-white/55">شحن لكل محافظات مصر</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// داخل التصميم الجديد لتفادي طبقات مكوّنات صغيرة بلا فائدة.
