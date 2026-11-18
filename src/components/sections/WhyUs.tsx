import { Link } from "@tanstack/react-router";
import { ShieldCheck, Truck, Lock, CreditCard, ArrowLeft } from "lucide-react";

import { waLink } from "@/lib/whatsapp";

/**
 * برتقالي) لا علاقة لها بالهوية. الآن كل شيء بزمردي + ذهبي فقط، والنصوص
 * قصيرة ومحفّزة (فعل + نتيجة) بدل أوصاف عامة.
 */
const features = [
  {
    icon: ShieldCheck,
    title: "منتجات مختارة",
    desc: "كل منتج يُراجع قبل نشره",
  },
  {
    icon: Truck,
    title: "توصيل ٢٤–٧٢ ساعة",
    desc: "لباب البيت في كل المحافظات",
  },
  {
    icon: Lock,
    title: "تغليف محايد",
    desc: "بدون اسم المنتج أو أي علامة",
  },
  {
    icon: CreditCard,
    title: "دفع عند الاستلام",
    desc: "استلم الأول.. وادفع بعدها",
  },
];

export function WhyUs() {
  return (
    <section className="py-5 md:py-6">
      <div className="container mx-auto px-4">
        {/* (2026-11-16) شريط واحد رفيع بفواصل ذهبية بدل ٤ كروت بيضاء متطابقة:
            الثقة تُقرأ كسطر واحد، وهي أقرب لهوية «شركة» لا «قالب متجر». */}
        <div className="overflow-hidden rounded-2xl border border-[#e8d9a8] bg-[linear-gradient(105deg,#fffdf8,#fdf8ea_55%,#fdf6e3)]">
          <ul className="grid grid-cols-1 divide-y divide-[#e8d9a8]/70 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-4 md:divide-x md:divide-x-reverse">
            {features.map((f) => (
              <li
                key={f.title}
                className="flex items-center justify-center gap-2.5 px-4 py-3 text-center sm:px-5 sm:py-4"
              >
                <f.icon className="h-5 w-5 shrink-0 text-[#c8961e]" aria-hidden strokeWidth={1.9} />
                <div className="min-w-0 text-center">
                  <div className="text-[12.5px] font-black leading-tight text-[#0b3b26]">
                    {f.title}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[#6d6250]">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center gap-2.5 text-center sm:flex-row">
          <Link
            to="/products/men"
            className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:shadow-md"
          >
            ابدأ التسوّق
            <ArrowLeft
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            />
          </Link>
          <a
            href={waLink("أريد الاستفسار")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 px-6 py-2.5 text-sm font-black text-primary transition hover:border-[#d4a017]/60 hover:text-[#8a6a12]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.444l4.553-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.15 0-4.148-.675-5.79-1.823l-.415-.268-2.694.864.84-2.607-.29-.435A9.723 9.723 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z" />
            </svg>
            اسأل قبل ما تطلب
          </a>
        </div>
      </div>
    </section>
  );
}
