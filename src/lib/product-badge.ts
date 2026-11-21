import type { Product } from "@/data/product-types";

type UseBadge = { label: string; className: string };

/**
 *   • زمردي `#0b6b3a` لأداء الرجال (انتصاب/تأخير/طاقة).
 *   • ذهبي `#e9b62c` للنساء والأجهزة (رغبة/تكبير/تضييق/ترطيب).
 *
 * The small use-case badge shown on every product card.
 * Kept in one module so the prerender shell and hydrated React card never
 * disagree about the visible badge text.
 */
/**
 * الوصف التي لا تحملها البطاقة، لذلك تُحسَب مسبقًا وقت التوليد وتُخزَّن في
 * `badgeLabel`/`badgeClass` — وهذه الدالة تبقى للنص الكامل (صفحة المنتج).
 */
type BadgeSource = Pick<Product, "id" | "name" | "category"> &
  Partial<Pick<Product, "nameEn" | "slug" | "description" | "ingredients" | "usage" | "benefits">>;

export function getUseBadge(product: BadgeSource): UseBadge {
  const text = [
    product.name,
    product.nameEn,
    product.slug,
    product.description,
    product.ingredients ?? "",
    product.usage ?? "",
    ...(product.benefits ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (product.category === "devices") {
    return /(ved|vacuum|pump|مضخة|تفريغ|erection)/.test(text)
      ? { label: "VED للانتصاب", className: "bg-[#e9b62c] text-[#04220f]" }
      : { label: "شد وتكبير", className: "bg-[#e9b62c] text-[#04220f]" };
  }

  if (product.category === "women") {
    if (/(filler|فيلر|تكبير الثدي|الخدود|paxtone|max filler)/.test(text))
      return { label: "تكبير وشد", className: "bg-[#e9b62c] text-[#04220f]" };
    if (/(tightening|تضييق|lovezone vaginal gel)/.test(text))
      return { label: "تضييق", className: "bg-[#e9b62c] text-[#04220f]" };
    if (/(viagra for women|انخفاض الرغبة)/.test(text))
      return { label: "دعم الرغبة", className: "bg-[#e9b62c] text-[#04220f]" };
    if (/(aromal|argi.fem)/.test(text) && !/(honey|عسل|drops|قطرات|نقط)/.test(text))
      return { label: "ترطيب", className: "bg-[#e9b62c] text-[#04220f]" };
    return { label: "رغبة وإثارة", className: "bg-[#e9b62c] text-[#04220f]" };
  }

  if (product.id === "m-01")
    return { label: "انتصاب وتضخيم", className: "bg-[#0b6b3a] text-white" };

  /**
   * شارة كل عسل/معجون رجالي تصبح «انتصاب» بدل السقوط على «طاقة وحيوية».
   */
  if (/(عسل|honey|macun|معجون)/.test(`${product.name} ${product.slug}`.toLowerCase()))
    return { label: "انتصاب", className: "bg-[#0b6b3a] text-white" };

  if (product.id === "m-62") return { label: "تأخير", className: "bg-[#0b6b3a] text-white" };

  if (
    /(dapoxetine|130\/60|170\/60|hard-on|ferrari 130\/60|porsche 130\/60|love extra|double shot|مفعول مزدوج)/.test(
      text,
    )
  )
    return { label: "انتصاب + تأخير", className: "bg-[#0b6b3a] text-white" };
  if (
    /(lidocaine|prilocaine|benzocaine|delay|تأخير|spray|بخاخ|emla|procomil|dooz|stallion|reman|toro duro)/.test(
      text,
    )
  )
    return { label: "تأخير", className: "bg-[#0b6b3a] text-white" };
  if (/(cialis|levitra|viagra|sildenafil|tadalafil|vardenafil|vegal|pfizer|oral jelly)/.test(text))
    return { label: "انتصاب", className: "bg-[#0b6b3a] text-white" };
  if (/(titan|big penis|leech|العلق)/.test(text))
    return { label: "تكبير", className: "bg-[#e9b62c] text-[#04220f]" };
  if (/(sotara|merson)/.test(text))
    return { label: "تحفيز موضعي", className: "bg-[#e9b62c] text-[#04220f]" };

  return { label: "طاقة وحيوية", className: "bg-[#0b6b3a] text-white" };
}
