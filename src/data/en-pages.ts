/**
 * النسخة الإنجليزية الجزئية — مصدر واحد للنصوص والـ hreflang.
 * قاعدة المحتوى: ترجمة أمينة للادعاءات الموجودة فعلياً في النسخة العربية
 * (نفس الميتا والهيرو والأسئلة الشائعة نصاً) — لا ادعاءات جديدة إطلاقاً.
 * الحدود: title ≤ 70 حرفاً وdescription ≤ 155 حرفاً مثل النسخة العربية.
 */

export interface EnFaq {
  question: string;
  answer: string;
}

export interface EnGuideSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface EnCategoryPage {
  /** مسار الصفحة الإنجليزية */
  path: string;
  /** مسار مقابلها العربي (لـ hreflang ولرابط التبديل) */
  arPath: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  faqs: EnFaq[];
  guide: EnGuideSection[];
  /** تصنيف الكتالوج العربي المعروض بقوائم nameEn */
  category: "men" | "women" | "devices";
  listLabel: string;
}

export const enHome = {
  path: "/en",
  arPath: "/",
  title: "Al Ikhlas Medical | Original Marital Health Products in Egypt",
  description:
    "Specialized in original marital wellness products for men and women in Egypt: carefully selected originals, discreet shipping, and cash on delivery.",
  h1: "Al Ikhlas Medical — Original Marital Health Products in Egypt",
  intro:
    "Al Ikhlas Medical is a company specialized in original marital health and happiness products for men and women in Egypt. Carefully selected original products, discreet shipping and cash on delivery.",
  browseLabel: "Browse by category",
  noteLabel: "The full catalog and product details are available in Arabic.",
  switchLabel: "العربية",
  howTitle: "How ordering works",
  steps: [
    {
      title: "Choose and read first",
      text: "Open the product page and read the ingredients, usage instructions and warnings before you order. Each listing states what the product does and what it does not.",
    },
    {
      title: "Order with cash on delivery",
      text: "Place the order from the site or through WhatsApp. Payment is cash on delivery where available, and our team confirms every order before it ships.",
    },
    {
      title: "Discreet shipping to all governorates",
      text: "Orders leave in neutral packaging with nothing on the outside describing the nature of the product, and are delivered to all governorates of Egypt.",
    },
  ],
  assuranceTitle: "Why customers order from Al Ikhlas Medical",
  assurances: [
    "Original products selected from trusted sources, with the source and packaging stated on each page.",
    "Prices and delivery fees shown before you confirm the order — no hidden charges at the door.",
    "A support team on WhatsApp to answer questions about a product, an order or an exchange.",
    "Educational content that does not promise a cure and does not replace a doctor or pharmacist.",
  ],
  faqs: [
    {
      question: "Are the products on Al Ikhlas Medical original?",
      answer:
        "Products are selected from trusted sources, and each product page states the source, the ingredients and the usage instructions. If you receive a product that does not match its description, contact us on WhatsApp and we will arrange an exchange.",
    },
    {
      question: "Is the packaging discreet?",
      answer:
        "Yes. Orders ship in neutral, discreet packaging to all governorates, with no indication of the nature of the product on the outer package, to protect your privacy.",
    },
    {
      question: "Do you offer cash on delivery?",
      answer:
        "Yes, cash on delivery is available wherever it is supported, and the delivery fee for your governorate is shown before you confirm the order.",
    },
    {
      question: "Is the content on the site medical advice?",
      answer:
        "No. The content is educational only and does not replace consulting a doctor or pharmacist. If you have a chronic condition such as heart, blood pressure, diabetes, liver or kidney disease, or you take prescription medication, consult your doctor before using any product.",
    },
  ],
  faqTitle: "Frequently asked questions",
  storyTitle: "What we do — and what we do not",
  story: [
    "Al Ikhlas Medical is a specialised store, not a marketplace. We work with a limited, deliberate catalog of marital health products for men and women, and every item we list is chosen because customers ask for it, because its source can be stated, and because its instructions can be explained in plain language. When a product cannot be described clearly, we do not list it.",
    "What we do not do matters just as much. We do not promise a cure, we do not present a supplement as a treatment for a medical condition, and we do not sell a product as a replacement for a doctor or a pharmacist. Marital health sits between medicine, psychology, habits and relationships; a store can help with one part of that picture, and pretending otherwise would be dishonest.",
    "So the site is built the other way round: read first, decide second. Each product page states what the product is, how it is used, what it contains and what to watch out for, and our team on WhatsApp answers questions about the product or the order before you pay. If a question needs a doctor, we say so — that answer costs us a sale and earns us a customer.",
    "Orders ship in neutral packaging with nothing on the outside describing the contents, delivery usually arrives within 24 to 72 hours across Egypt, and payment is cash on delivery wherever it is supported. If something arrives different from its description, tell us and we will arrange an exchange.",
  ],
};

export const enCategories: EnCategoryPage[] = [
  {
    path: "/en/products/men",
    arPath: "/products/men",
    title: "Men's Marital Health Products in Egypt | Al Ikhlas Medical",
    description:
      "Original men's marital health products in Egypt: supplements, honey, gels and sprays for energy and performance. Discreet shipping, cash on delivery.",
    eyebrow: "Men's Health",
    heroTitle: "Men's Marital Health Products",
    heroDescription:
      "Carefully selected dietary supplements, royal honey, sprays, creams and topical gels supporting men's marital health, with privacy and discreet shipping across Egypt.",
    listLabel: "All men's products",
    category: "men",
    guide: [
      {
        title: "Start with the need, not the product",
        paragraphs: [
          "Most people arrive here with a vague feeling rather than a clear request: less energy through the week, timing that feels out of control, a moment that did not go as hoped. Naming the need first saves money and disappointment, because the products on this page are not interchangeable. A honey or a capsule works on general vitality. A spray or a cream works on timing and local comfort. A gel works on lubrication and sensation.",
          "Write down one sentence about what you actually want to change. Then open two or three product pages and read what each one states about itself. If a product promises to cure a condition, close the page — a product that claims to treat a disease is either overstating itself or belongs under a doctor's supervision, not in a shopping cart.",
        ],
        bullets: [
          "Energy and vitality through the week: honey, ginseng and supplement formats.",
          "Timing and control: delay sprays or creams, used in the small amount stated on the label.",
          "Comfort and lubrication: topical gels used according to their instructions.",
          "A diagnosed medical condition: a doctor first, and products only with their agreement.",
        ],
      },
      {
        title: "Read the page before you pay",
        paragraphs: [
          "Every product page here is written to be read before the order, not after it. Look for four things in this order: what the product is and what it is used for, the ingredients or the composition, the usage instructions and dose, and the warnings. If any of the four is missing or unclear, ask us on WhatsApp before you confirm — a question costs a minute, a wrong product costs a week.",
          "Do not stack products. Combining a strong supplement with a spray and a cream on the same evening is how people end up with a headache, a numb patch or a bad experience they then blame on the store. Use one product at a time, read how it behaves with your body, and keep anything out of reach of children.",
        ],
      },
      {
        title: "Timing is human — when a conversation helps more than a product",
        paragraphs: [
          "Occasional variation in timing or desire is ordinary. Stress, poor sleep, a heavy week, anxiety about performance, a new relationship or a period of distance between partners all move the needle, and none of them is a character flaw. Products can support a moment; they cannot remove the cause. If pressure is the cause, removing the pressure does more than any bottle.",
          "Some situations belong to a doctor from the start: chest pain or heart disease, uncontrolled blood pressure, diabetes, liver or kidney disease, nitrate medication for the heart, or a change that appeared suddenly and stayed. Consult your doctor before using anything, and tell the pharmacist what you already take so nothing interacts.",
        ],
      },
      {
        title: "Privacy, delivery and payment",
        paragraphs: [
          "Everything ships in neutral packaging that says nothing about what is inside, to all governorates of Egypt, and delivery usually arrives within 24 to 72 hours. You pay cash on delivery where it is supported, and the price plus the delivery fee for your governorate is shown before you confirm.",
          "If a product arrives different from its description, contact us and we will arrange an exchange. Unopened items in their original condition can be returned within 14 days of receipt, and refunds are processed within 7 business days after inspection. Your questions on WhatsApp are treated as private, and we do not ask for information we do not need to deliver the order.",
        ],
      },
    ],
    faqs: [
      {
        question: "What are men's marital health products?",
        answer:
          "They are selected products that support a man's needs within marriage, such as energy and vitality, timing control, comfort and confidence. The right choice depends on your health condition and type of need, and consulting a doctor is necessary with chronic diseases or when taking other medications.",
      },
      {
        question: "How do I choose between honey, capsules, gel or spray?",
        answer:
          "Honey and supplements usually support energy and vitality, while topical products such as gels or sprays are used per their instructions for a specific need. Read each product's description, ingredients and usage instructions, and do not combine more than one strong product at the same time without specialist advice.",
      },
      {
        question: "Are men's marital happiness products safe?",
        answer:
          "Safety depends on the ingredients, dose, product source and your health condition. Do not use any product if you take heart, blood pressure or nitrate medications except after consulting your doctor. All orders at Al Ikhlas Medical are shipped discreetly with clear usage instructions for each product.",
      },
      {
        question: "Is there discreet shipping for men's marital health products inside Egypt?",
        answer:
          "Yes, orders ship in neutral, discreet packaging to all governorates, with no indication of the product's nature on the outer package to protect your privacy.",
      },
      {
        question: "When should I consult a doctor before using marital health products?",
        answer:
          "Consult a doctor if you have heart, blood pressure, diabetes, liver or kidney disease, take chronic medications, or have a known allergy to any ingredient. The content and products are not a substitute for specialized medical advice.",
      },
    ],
  },
  {
    path: "/en/products/women",
    arPath: "/products/women",
    title: "Women's Marital Health Products in Egypt | Al Ikhlas Medical",
    description:
      "Original women's marital health products in Egypt: drops, honey, gels and selected products for comfort and vitality. Discreet shipping, cash on delivery.",
    eyebrow: "Women's Health",
    heroTitle: "Women's Marital Health Products",
    heroDescription:
      "Carefully selected products supporting comfort, lubrication, vitality and confidence in marriage for women, with full commitment to privacy and discreet delivery.",
    listLabel: "All women's products",
    category: "women",
    guide: [
      {
        title: "Comfort is not a luxury",
        paragraphs: [
          "A large part of what is sold as a women's issue is really a comfort problem: dryness that makes intimacy painful, low energy at the end of a long day, or a body that simply needs more time than the moment allows. Comfort is not a luxury item on the side of a relationship — it is the ground the rest stands on, and it is worth solving deliberately rather than enduring quietly.",
          "This page collects products chosen for that purpose: drops and honey for vitality and mood, gels for lubrication and local comfort, and selected formats for desire and energy. None of them is a treatment, and none of them replaces a conversation with your partner or with a doctor when something hurts.",
        ],
      },
      {
        title: "Formats, and what each one is actually for",
        paragraphs: [
          "The format tells you what the product is good at. Drops and honey are taken orally and are aimed at general vitality, mood and energy over days rather than minutes. Gels and topical products are used locally for lubrication and comfort, and their effect is immediate but short-lived. Capsules and supplements sit in between: a daily routine rather than a single evening.",
          "Read the ingredients on the page, then the instructions, then the warnings. If you are pregnant or breastfeeding, have a hormonal condition, take regular medication, or have reacted badly to a product before, ask a doctor before ordering — the fact that a product is sold without a prescription does not make it suitable for everyone.",
        ],
        bullets: [
          "Dryness or pain during intimacy: a lubricating gel used as instructed.",
          "Low energy, low mood: drops or honey aimed at vitality, taken consistently.",
          "Desire that has faded gradually: worth discussing with a doctor as well as reading about.",
          "Pregnancy, breastfeeding or chronic medication: a doctor's opinion before anything else.",
        ],
      },
      {
        title: "Check before you order",
        paragraphs: [
          "Four questions are enough to avoid most bad purchases: do I understand what this product does, do I know how and when to use it, do I know what is inside it, and is there any reason it would not suit my body right now. If you cannot answer all four from the product page, message us — our team answers in Arabic and English, and will tell you when the honest answer is «this one is not for you».",
          "Order one product at a time when you are trying something new. It is the only way to know what worked, and it protects you from mixing ingredients you have never tested together.",
        ],
      },
      {
        title: "Your privacy, and your questions",
        paragraphs: [
          "Orders arrive in neutral packaging that does not describe the contents, to all governorates of Egypt, usually within 24 to 72 hours, with cash on delivery where it is supported. Nothing about the product appears on the outside of the parcel, and the WhatsApp conversation stays between you and the team.",
          "Unopened products in their original condition can be exchanged or returned within 14 days of receipt, and refunds are processed within 7 business days after inspection. If the packaging arrived damaged or the product does not match its description, send a photo and we will fix it.",
        ],
      },
    ],
    faqs: [
      {
        question: "What are women's marital health products?",
        answer:
          "They are selected products supporting comfort, vitality, lubrication, confidence and a better marital experience for women. The choice method varies by need and product type; reading ingredients and instructions and consulting a doctor during pregnancy or breastfeeding or with chronic diseases is preferred.",
      },
      {
        question: "How do I choose between drops, honey, gel or topical products?",
        answer:
          "Drops and honey usually support vitality, mood and energy, while gels and topical products are used for needs such as lubrication or local comfort per the product's instructions. Do not use more than one product at the same time without understanding the ingredients or consulting a specialist.",
      },
      {
        question: "Are women's marital happiness products suitable for all women?",
        answer:
          "Not all products suit everyone. Avoid any product containing ingredients you may be allergic to, and consult a doctor during pregnancy and breastfeeding, hormone disorders, chronic diseases or regular medication use.",
      },
      {
        question: "Is shipping discreet for women's marital health products?",
        answer:
          "Yes, orders are prepared in neutral, discreet packaging, and the product's nature is not mentioned on the outer package to protect privacy in all governorates of Egypt.",
      },
      {
        question: "Can I pay on delivery?",
        answer:
          "Yes, you can complete your order via WhatsApp or direct order, with cash on delivery available depending on the governorate and the shipping details available at order confirmation.",
      },
    ],
  },
  {
    path: "/en/products/devices",
    arPath: "/products/devices",
    title: "Medical Devices & Supplies — Al Ikhlas Medical",
    description:
      "Marital health devices and medical supplies: vacuum pumps, traction devices and rehabilitation tools, clearly described quality, discreet shipping.",
    eyebrow: "Medical Devices",
    heroTitle: "Medical Devices & Supplies",
    heroDescription:
      "Reliable, carefully selected medical devices and supplies, with high quality and discreet shipping to all governorates for a safer, more professional experience.",
    listLabel: "All devices & supplies",
    category: "devices",
    guide: [
      {
        title: "What a device can and cannot do",
        paragraphs: [
          "A device is a tool with a narrow, honest job. A vacuum pump draws blood into the tissue with negative pressure and a constriction ring holds it there; a traction device applies steady, gentle tension over months; a pump kit is used for hygiene, maintenance or rehabilitation depending on what it was designed for. None of these devices changes the underlying cause of a medical problem, and none of them is a substitute for a diagnosis.",
          "That is why every device page states the intended use, the parts included and the warnings. If you have a bleeding disorder, take blood thinners, have a heart condition, or have sickle cell disease, speak to your doctor before using a vacuum device at all.",
        ],
      },
      {
        title: "Read the manual first, then use it once calmly",
        paragraphs: [
          "The most common mistake with a device is impatience: too much pressure, too long a session, a ring left on far longer than the instructions allow. Read the manual once from beginning to end, assemble the parts on a clean surface, and try it for a short, unhurried session with the pressure low. The goal of the first session is familiarity, not results.",
          "Keep to the time stated in the manual, release the pressure if there is pain, numbness or a colour change, and stop immediately if anything feels wrong. A device that hurts is being used incorrectly — never push through discomfort to reach an expected outcome.",
        ],
        bullets: [
          "Assemble and check the seals before every use.",
          "Start at the lowest pressure setting and stay within the time in the manual.",
          "Never leave a constriction ring on longer than instructed.",
          "Stop at pain, numbness or discolouration and consult a doctor if it continues.",
        ],
      },
      {
        title: "Care and hygiene keep it working",
        paragraphs: [
          "A device lasts as long as it is cleaned. Wash the parts that contact the body with warm water and a mild soap after each use, rinse thoroughly, and dry completely before storing — moisture left inside a cylinder or a valve is what turns a working device into a broken one. Check the tubing and the seals for cracks, and replace worn parts rather than repairing them with tape.",
          "Store the device clean, dry and out of reach of children, ideally in its own pouch or box. Sharing a device between partners without proper cleaning is a hygiene risk, and a cracked ring or a leaking valve is a safety risk; both are reasons to replace the part, not to keep using it.",
        ],
      },
      {
        title: "Delivery, returns and support",
        paragraphs: [
          "Devices ship in neutral packaging to all governorates of Egypt, usually within 24 to 72 hours, with cash on delivery where it is supported. Every device page lists the parts included, so check that the box matches before you dispose of the packaging.",
          "Unopened devices in their original condition can be exchanged or returned within 14 days of receipt, and refunds are processed within 7 business days after inspection. For hygiene reasons, opened devices that contact the body cannot be returned — if a device is faulty on arrival, contact us the same day with photos and we will arrange a replacement.",
        ],
      },
    ],
    faqs: [
      {
        question: "What medical devices and supplies are available in this section?",
        answer:
          "The section includes carefully selected vacuum pumps, traction devices and rehabilitation tools supporting marital health needs, with a clear description for each product on its page.",
      },
      {
        question: "How do I choose the right device for me?",
        answer:
          "Read the product description, usage instructions and warnings stated on its page, and choose according to your need. If you have a chronic health condition or take medications, consult your doctor before use.",
      },
      {
        question: "Is shipping discreet for medical devices and supplies?",
        answer:
          "Yes, all orders ship in completely neutral packaging that does not reveal the product's nature, and no content details are written on the outer package or the shipping policy.",
      },
      {
        question: "Can I pay on delivery?",
        answer:
          "Yes, you can complete your order via WhatsApp or direct order, with cash on delivery available depending on the governorate and the shipping details available at order confirmation.",
      },
      {
        question: "What is the return policy for devices?",
        answer:
          "You are entitled to exchange or return within 14 days from the receipt date, provided the product is unopened and in its original condition, and the refund is processed within 7 business days after inspection.",
      },
    ],
  },
];

/** خرائط التقابل عربي/إنجليزي للـ hreflang (الرئيسية + 3 فئات). */
export const hreflangMap: Record<string, string> = {
  "/": "/en",
  "/products/men": "/en/products/men",
  "/products/women": "/en/products/women",
  "/products/devices": "/en/products/devices",
  "/en": "/",
  "/en/products/men": "/products/men",
  "/en/products/women": "/products/women",
  "/en/products/devices": "/products/devices",
};

/**
 * قائمة alternates الكاملة لصفحة معطاة: النسخة العربية، الإنجليزية، وx-default
 * (العربية هي الافتراضية للموقع). تُستخدم في الـ prerender والـ sitemap ووقت التشغيل.
 */
export function alternatesFor(path: string): { lang: string; href: string }[] {
  const other = hreflangMap[path];
  if (!other) return [];
  const isEn = path.startsWith("/en");
  const ar = isEn ? other : path;
  const en = isEn ? path : other;
  return [
    { lang: "ar", href: ar },
    { lang: "en", href: en },
    { lang: "x-default", href: ar },
  ];
}
