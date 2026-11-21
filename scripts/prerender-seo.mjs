/**
 * ============================================================
 * Pre-render SEO HTML for each route
 * ============================================================
 * Generates a static HTML file per page (products, articles, and
 * key static routes) with:
 *   • A unique <title> and <meta description>
 *   • Full Open Graph + Twitter card meta
 *   • <link rel="canonical">
 *   • Schema.org JSON-LD (Product / Article / BreadcrumbList / WebPage)
 *   • A visible initial HTML fallback holding the real route text
 *     (product name, description, benefits, article body) so users,
 *     assistive technology, and crawlers see the same content before
 *     the React app boots.
 *
 * Uses Vite's ssrLoadModule to resolve TypeScript data files
 * without booting a full dev server.
 * ============================================================
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
/**
 * أصل الموقع المطلق للـ canonical والـ sitemap والـ og:image.
 *
 * الأولوية: SITE_URL (يُضبط على دومين المتجر عند ربطه) ← نطاق نشر Vercel
 * (VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL) ← الدومين الرسمي كاحتياط.
 * السبب: دومين alikhlasmedical.store لسه من غير DNS، فلو أعلنّا صورته في
 * og:image على نطاق ميت، واتساب/فيسبوك مش بيقدروا يجيبوا الصورة، فتظهر
 * المشاركة بدون لوجو. الاعتماد على نطاق النشر الفعلي يضمن صورة تعمل دائمًا.
 */
const CANONICAL_SITE_URL = "https://alikhlasmedical.store";
const DEPLOY_HOST = (
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  ""
).trim();
const SITE_URL = (
  process.env.SITE_URL ||
  (DEPLOY_HOST
    ? `https://${DEPLOY_HOST.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : CANONICAL_SITE_URL)
).replace(/\/$/, "");

/**
 * `src/lib/site-config.ts` — index.html يحمل رموزًا فقط (__WHATSAPP_NUMBER__
 * و__WHATSAPP_DISPLAY__ و__GA_MEASUREMENT_ID__) فلا رقم مكتوب يدويًا في أي
 * صفحة من الـ110، ولا انجراف بين زر الواتساب وJSON-LD.
 */
let CONTACT = {
  whatsapp: "201000000000",
  display: "+20 100 000 0000",
  ga: "",
  gtm: "",
};
const SITE_NAME = "الإخلاص ميديكال";

/**
 * 🏷️ متغيّرات بيئة البناء.
 *
 * العميل يُبنى بـ`vite build` (mode=production) فيقرأ `.env.production`، بينما
 * خادم الـSSR هنا يعمل في وضع development فلا يقرأه. النتيجة كانت أن معرّف
 * GTM (ومعرّف GA) يوصل للـbundle ولا يوصل للـHTML المبنى مسبقًا، فتُحذف كتلة
 * الوسم من كل صفحة رغم وجود المعرّف. لذلك نقرأ الملف بأنفسنا هنا.
 */
function readProductionEnv() {
  const file = resolve(ROOT, ".env.production");
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}
const PROD_ENV = readProductionEnv();
const normalizeGtm = (value) => {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  return /^GTM-[A-Z0-9]{4,}$/.test(raw) ? raw : "";
};

/** 🗂️ رقم إصدار الكاش من المصدر المركزي الوحيد. */
const { version: CACHE_VERSION } = JSON.parse(
  readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"),
);

/** يلحق رقم الإصدار بمسار صورة/أصل (يزيل أي ?v= قديم أولاً). */
function assetUrl(path) {
  const base = String(path).split("?")[0];
  return `${base}?v=${CACHE_VERSION}`;
}

/** HTML-escape */
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * اسم المعدود الصحيح نحوياً بعد الرقم (3–10 جمع، 11+ مفرد منصوب).
 * يُستخدم في عناوين قوائم المنتجات الثابتة: «— 54 منتجاً» / «— 7 منتجات».
 */
function arabicCountNoun(n) {
  const v = Number(n) || 0;
  if (v >= 3 && v <= 10) return "منتجات";
  return "منتجاً";
}

/** وصف مقتطع أثناء البناء — يُبلَّغ عنه في النهاية بدل أن يمر بصمت. */
const TRUNCATED_META = [];

/**
 (2026-11-14) التحذير كان يقول «قصّر النص» دون أن يقول **أي صفحة** — فكان
 من المستحيل تقريبًا العثور على المصدر بين 286 صفحة. الصفحة الحالية تُسجّل
 هنا (تُضبط في renderHtml) فيذكر البلاغ المسار الكانوني، ويُجمَّع بالمسار
 حتى لا يتكرر نفس النص عشر مرات.
 */
let CURRENT_ROUTE = "";

/**
 (2026-10-10) مصدر واحد: خوارزمية الاقتطاع تعيش في src/lib/seo.ts فقط
 وتُحقن هنا من main عبر ssrLoadModule؛ هذا الغلاف يضيف بلاغ الاقتطاع
 ولا يكرر المنطق (كانت نسختان متوازيتان خطر انزلاق صامت).
 */
let seoMakeMetaDescription = null;
function makeMetaDescription(text = "", maxLength = 155, route = CURRENT_ROUTE) {
  if (!seoMakeMetaDescription) {
    throw new Error("makeMetaDescription called before seo.ts injection in main()");
  }
  const normalized = String(text).trim().replace(/\s+/g, " ");
  const out = seoMakeMetaDescription(text, maxLength);
  // مرة وأُعيد تمريرها تُبلَّغ كأنها جديدة — فظهرت إدخالات كاذبة ومكرّرة
  // وأخفت العشرة الحقيقية.
  if (normalized.length > maxLength && out.endsWith("…")) {
    // تجميع بالمسار + النص: الصفحة الواحدة تطلب الوصف أكثر من مرة (meta +
    // og + twitter) فنرى نفس النص 3 مرات بلا هذه التجميدة.
    const length = normalized.length;
    const key = `${route}|${length}`;
    if (!TRUNCATED_META.some((t) => t.key === key)) {
      TRUNCATED_META.push({
        key,
        route: route || "(unknown route)",
        length,
        maxLength,
        preview: `…${out.slice(-40)}`,
      });
    }
  }
  return out;
}

/**
 * Titles are emitted verbatim.
 *
 * The SPA sets `document.title` from the same route data without truncation,
 * so trimming here made the initial HTML and the rendered DOM disagree
 * (Google renders JS and may index either copy). Titles that are too long are
 * a data problem: shorten them at the source instead of clipping at build time.
 */
function makeTitle(text = "") {
  return String(text).trim().replace(/\s+/g, " ");
}

/**
 * وهي أيضاً شبكة الأمان للـ nav المشتق قبل حقن البيانات.
 */
const NAV_CORE = [
  ["/products/men", "منتجات الرجال"],
  ["/products/women", "منتجات النساء"],
  ["/products/devices", "الأجهزة الطبية"],
  ["/products/guides", "دليل الاختيار"],
  ["/products/prices", "كل الأسعار"],
  ["/education", "إرشادات المختصين"],
  ["/about", "من نحن"],
  ["/medical-review-board", "شفافية المحتوى"],
  ["/contact", "تواصل معنا"],
  ["/terms", "الشروط والأحكام"],
  ["/en", "English"],
];

/**
 * جماعية عند أي تغيير slug عبر مئات الصفحات.
 */
let seoNavLinks = null;

/** اختصار عنوان طويل لعنوان رابط nav: أول مقطع قبل فاصل، وبحد 42 حرفاً. */
function navPhrase(text = "") {
  const first = String(text)
    .split(/\s+[|—:]\s+/)[0]
    .trim();
  return first.length > 42 ? `${first.slice(0, 41).trim()}…` : first;
}

/**
 * لأبعاد og بدل افتراضات ثابتة: أي صفحة لا تمرر أبعاداً صريحة تُقرأ أبعاد
 * صورتها من القرص، فلا يُعلن og:image:width/height كاذب أبداً ولا تُقصى صورة
 * مربعة في بطاقة كبيرة. null عند تعذر القراءة (يبقى الاحتياط 1200×631).
 */
/** نوع MIME من امتداد الصورة — يُستخدم في og:image:type. */
function ogMime(url) {
  const u = String(url).split("?")[0].toLowerCase();
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".png")) return "image/png";
  return "image/webp";
}

function imageDims(imageUrl) {
  try {
    const rel = String(imageUrl).replace(SITE_URL, "").split("?")[0].split("#")[0];
    const p = resolve("public", rel.startsWith("/") ? rel.slice(1) : rel);
    const fd = openSync(p, "r");
    const head = Buffer.alloc(32);
    readSync(fd, head, 0, 32, 0);
    closeSync(fd);
    const sig = head.slice(0, 4).toString("latin1");
    if (sig === "RIFF" && head.slice(8, 12).toString("latin1") === "WEBP") {
      const chunk = head.slice(12, 16).toString("latin1");
      if (chunk === "VP8X") {
        return { width: 1 + head.readUIntLE(24, 3), height: 1 + head.readUIntLE(27, 3) };
      }
      if (chunk === "VP8 ") {
        return {
          width: head.readUInt16LE(26) & 0x3fff,
          height: head.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === "VP8L") {
        const b = head.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    if (head.readUInt32BE(0) === 0x89504e47) {
      return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
    }
    if (head[0] === 0xff && head[1] === 0xd8) {
      const data = readFileSync(p);
      let i = 2;
      while (i + 9 < data.length) {
        if (data[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = data[i + 1];
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return { width: data.readUInt16BE(i + 7), height: data.readUInt16BE(i + 5) };
        }
        i += 2 + data.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* ملف غير موجود/غير مقروء — يعود المحتاط الافتراضي */
  }
  return null;
}

/** Build a complete HTML page from the template + overrides */
function buildHtml(template, opts) {
  const {
    title,
    description,
    image,
    canonical,
    jsonLd = [],
    bodyContent = "",
    type = "website",
    noindex = false,
    preloadImage = "",
    preloadProducts = [],
    // (مش أبعاد العرض) + alt وصفية (SEO + accessibility + معاينة المشاركة).
    imageAlt,
    imageWidth,
    imageHeight,
    lang = "ar-EG",
    dir = "rtl",
    locale = "ar_EG",
    hreflang = [],
    navLinks = null,
  } = opts;

  // كل صفحة بلا أبعاد صريحة تُقرأ أبعاد صورتها — فلا إعلان og كاذب أبداً.
  const realDims = !imageWidth || !imageHeight ? imageDims(image) : null;
  const ogW = imageWidth || (realDims && realDims.width) || 1200;
  const ogH = imageHeight || (realDims && realDims.height) || 631;

  CURRENT_ROUTE = String(canonical || "").replace(SITE_URL, "") || "/";

  let html = template;
  html = html.replace(/<html lang="[^"]*" dir="rtl">/, `<html lang="${lang}" dir="${dir}">`);
  // 🎯 اقتطاع ذكي للـ title والـ description إلى أطوال مثالية للظهور الكامل في Google.
  const safeTitle = esc(makeTitle(title));
  const safeDesc = esc(makeMetaDescription(description));
  const safeImg = esc(image);
  const safeCanonical = esc(canonical);

  // title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`);

  // description
  // The template keeps this tag formatted across multiple lines. Match the
  // complete meta element by attributes rather than assuming a one-line tag;
  // otherwise every prerendered route receives a second description and search
  // engines may pick the generic template text instead of the route-specific
  // description.
  const descriptionMeta =
    /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["'][^"']*["'])[^>]*>/i;
  if (descriptionMeta.test(html)) {
    html = html.replace(descriptionMeta, `<meta name="description" content="${safeDesc}" />`);
  } else {
    html = html.replace("</head>", `  <meta name="description" content="${safeDesc}" />\n</head>`);
  }

  // og + twitter
  // Route head data can already exist in the Vite template (for example the
  // home route's OG tags). Keep exactly one copy of each singleton metadata
  // tag so product-specific social previews cannot compete with a generic copy.
  const replaceOrInsert = (regex, tag) => {
    const normalizedSource = regex.source.replaceAll("<meta ", "<meta\\s+");
    const globalRegex = new RegExp(
      normalizedSource,
      regex.flags.includes("g") ? regex.flags : `${regex.flags}g`,
    );
    let replaced = false;
    html = html.replace(globalRegex, () => {
      if (replaced) return "";
      replaced = true;
      return tag;
    });
    if (!replaced) html = html.replace("</head>", `  ${tag}\n</head>`);
  };
  replaceOrInsert(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${safeTitle}" />`,
  );
  replaceOrInsert(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  replaceOrInsert(
    /<meta property="og:type"[^>]*>/,
    `<meta property="og:type" content="${esc(type)}" />`,
  );
  replaceOrInsert(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${safeCanonical}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image"[^>]*>/,
    `<meta property="og:image" content="${safeImg}" />`,
  );
  const safeImgAlt = esc(imageAlt || title);
  replaceOrInsert(
    /<meta property="og:image:width"[^>]*>/,
    `<meta property="og:image:width" content="${ogW}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image:height"[^>]*>/,
    `<meta property="og:image:height" content="${ogH}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image:alt"[^>]*>/,
    `<meta property="og:image:alt" content="${safeImgAlt}" />`,
  );
  // نوع الصورة صريحًا: بعض منصات المشاركة (واتساب) لا تعرض WebP، فتعلن
  // الصفحة نوع الصورة الفعلي ليقرأها الزاحف بثقة.
  replaceOrInsert(
    /<meta property="og:image:type"[^>]*>/,
    `<meta property="og:image:type" content="${ogMime(safeImg)}" />`,
  );
  replaceOrInsert(
    /<meta property="og:site_name"[^>]*>/,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
  );
  replaceOrInsert(
    /<meta property="og:locale"[^>]*>/,
    `<meta property="og:locale" content="${locale}" />`,
  );
  // للصفحات المتقابلة الثمانية؛ تُحقن في الثابت وتُدار وقت التشغيل بـ applyHreflang.
  if (Array.isArray(hreflang) && hreflang.length > 0) {
    const altTags = hreflang
      .map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${SITE_URL}${a.href}" />`)
      .join("\n    ");
    html = html.replace("</head>", `${altTags}\n    </head>`);
  }
  replaceOrInsert(
    /<meta name="twitter:card"[^>]*>/,
    // منصات المشاركة الصورة المربعة تشويهاً (تحذير J3 ×110 في تدقيق الموقع).
    `<meta name="twitter:card" content="${
      ogW && ogH && ogW / ogH >= 1.4 ? "summary_large_image" : "summary"
    }" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:image"[^>]*>/,
    `<meta name="twitter:image" content="${safeImg}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:image:alt"[^>]*>/,
    `<meta name="twitter:image:alt" content="${safeImgAlt}" />`,
  );

  // canonical
  if (/<link rel="canonical"[^>]*>/.test(html)) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${safeCanonical}" />`,
    );
  } else {
    html = html.replace("</head>", `  <link rel="canonical" href="${safeCanonical}" />\n</head>`);
  }

  // robots directive (explicit per page)
  const robotsContent = noindex
    ? "noindex,follow,noarchive,nosnippet,noimageindex"
    : "index,follow,max-image-preview:large,max-snippet:-1";
  for (const name of ["robots", "googlebot"]) {
    const pattern = new RegExp(`<meta name="${name}"[^>]*>`);
    if (pattern.test(html)) {
      html = html.replace(pattern, `<meta name="${name}" content="${robotsContent}" />`);
    } else {
      html = html.replace(
        "</head>",
        `  <meta name="${name}" content="${robotsContent}" />\n</head>`,
      );
    }
  }

  for (const product of preloadProducts.slice(0, 4)) {
    if (!product.image) continue;
    const thumb = (folder) => assetUrl(product.image.replace("/images/", `/images/${folder}/`));
    const srcset = `${thumb("thumbs-120")} 240w, ${thumb("thumbs-180")} 360w, ${thumb("thumbs")} 480w, ${assetUrl(product.image)} 800w`;
    html = html.replace(
      "</head>",
      `<link rel="preload" as="image" href="${esc(thumb("thumbs"))}" imagesrcset="${esc(srcset)}" imagesizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 300px" fetchpriority="high" />\n</head>`,
    );
  }

  // Route-specific LCP preload. The education index hydrates its first
  // article card after the shell; declaring the same image in the initial
  // document removes the lazy-image discovery delay without preloading every
  // article image on the site.
  if (preloadImage) {
    html = html.replace(
      "</head>",
      `  <link rel="preload" as="image" href="${esc(preloadImage)}" fetchpriority="high" />
</head>`,
    );
  }

  // JSON-LD blocks
  jsonLd.forEach((data, i) => {
    const tag = `<script type="application/ld+json" data-prerender="${i}">${JSON.stringify(data)}</script>`;
    html = html.replace("</head>", `${tag}\n</head>`);
  });

  // Put the real route content in the initial HTML. React replaces these
  // children when it mounts, but the pre-render remains visible and useful to
  // users, assistive technology, and crawlers instead of being a clipped
  // crawler-only copy.
  if (bodyContent) {
    // Keep the no-JS content and link graph, but do not paint a standalone
    // hero or placeholder shell before React mounts the actual page.
    const visibleFallback = `<div data-prerender-content dir="${dir}" style="max-width:1120px;margin:0 auto;padding:32px 16px 48px;color:#14213d;font-family:Arial,sans-serif;line-height:1.8;">${bodyContent}</div>`;
    // First-paint HTML shipped with ZERO internal links (all navigation is
    // client-rendered), so Google's first pass saw no link graph and left
    // inside #root gives every page real internal links pre-hydration (and
    // for no-JS); hydration swaps it for the full React footer.
    const staticNav =
      `<nav data-prerender-nav aria-label="تصفح سريع">` +
      (navLinks || seoNavLinks || NAV_CORE)
        .map(([href, label]) => `<a href="${href}">${esc(label)}</a>`)
        .join("") +
      `</nav>`;
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${staticNav}${visibleFallback}</div>`,
    );
  }

  // The <noscript> block is the only copy of the page a no-JS visitor (and a
  // JS-less crawler fetch) can read. The template ships one generic marketing
  // sentence on every route, which made 252 pages share identical fallback
  // text that matched none of them — replace it with this page's own title and
  // description so the no-JS view is truthful and page-specific.
  html = html.replace(
    /(<noscript>\s*<div[^>]*>\s*)<p>[\s\S]*?<\/p>/,
    `$1<p>${safeTitle}</p>\n        <p>${safeDesc}</p>`,
  );

  // رموز التواصل/التحليلات → القيم الفعلية (المصدر الوحيد site-config).
  html = html
    .replaceAll("__WHATSAPP_NUMBER__", CONTACT.whatsapp)
    .replaceAll("__WHATSAPP_DISPLAY__", CONTACT.display)
    .replaceAll("__GA_MEASUREMENT_ID__", CONTACT.ga);

  // 🏷️ Google Tag Manager: لو لا يوجد معرّف (تطوير/معاينة) تُحذف الكتلتان
  // بالكامل، فلا طلب شبكة لجوجل ولا iframe بعنوان ناقص.
  if (CONTACT.gtm) {
    html = html.replaceAll("__GTM_ID__", CONTACT.gtm);
  } else {
    html = html.replace(/<!--\s*gtm:start\s*-->[\s\S]*?<!--\s*gtm:end\s*-->/g, "");
  }

  return html;
}

async function prerender() {
  if (!existsSync(resolve(DIST, "index.html"))) {
    console.error("✗ dist/index.html not found. Run npm run build first.");
    process.exit(1);
  }

  const template = readFileSync(resolve(DIST, "index.html"), "utf-8");

  // 🚀 Minimal Vite server — only for ssrLoadModule (TypeScript resolution).
  // No plugins, no optimization — fastest possible boot.
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });

  let productsCount = 0;
  let articlesCount = 0;
  let landingCount = 0;
  let staticCount = 0;

  try {
    const {
      products,
      getProductsByCategory,
      getPublicProductsByCategory,
      getCrossSellsForProduct,
      getFeaturedProducts,
      getProductById,
      HOMEPAGE_CONCERN_CANDIDATES,
      HOMEPAGE_EXCLUDED_PRODUCT_IDS,
    } = await vite.ssrLoadModule("/src/data/products.ts");
    const siteConfig = await vite.ssrLoadModule("/src/lib/site-config.ts");
    CONTACT = {
      whatsapp: siteConfig.WHATSAPP_NUMBER,
      display: siteConfig.WHATSAPP_DISPLAY,
      ga: siteConfig.GA_MEASUREMENT_ID || (PROD_ENV.VITE_GA_ID ?? "").trim(),
      gtm: normalizeGtm(siteConfig.GTM_CONTAINER_ID || PROD_ENV.VITE_GTM_ID),
    };
    const { getProductReviews, VISIBLE_REVIEW_COUNT } = await vite.ssrLoadModule(
      "/src/lib/legacy-product-reviews.ts",
    );
    const {
      makeProductMetaDescription,
      makeProductMetaTitle,
      makeMetaDescription: seoMakeMetaDescriptionFn,
      itemListSchema,
      breadcrumbSchema,
      faqSchema,
      productSchema,
    } = await vite.ssrLoadModule("/src/lib/seo.ts");
    seoMakeMetaDescription = seoMakeMetaDescriptionFn;
    const {
      getProductsForArticle,
      getRelatedArticles,
      getArticlesForLandingPage,
      getArticlesForProduct,
      relatedProductsFor,
    } = await vite.ssrLoadModule("/src/lib/internal-links.ts");
    const { editorialTrustSignals } = await vite.ssrLoadModule(
      "/src/data/editorial-trust-signals.ts",
    );
    const { BUNDLE_DISCOUNT_RATE } = await vite.ssrLoadModule("/src/lib/bundle-discount.ts");
    const { getProductFAQs } = await vite.ssrLoadModule("/src/data/product-faqs.ts");
    // الثقة تُحقن من `src/lib/policy-format.ts` بواسطة `sectionsHtml` أدناه.

    let articles = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles.ts");
      articles = mod.articles || [];
    } catch {
      /* no articles */
    }
    // (src/data/og-articles.generated.ts) حتى تتطابق النسختان الثابتة/بعد الإhydration.
    let ogArticleImagePath = () => null;
    try {
      const mod = await vite.ssrLoadModule("/src/data/og-articles.generated.ts");
      ogArticleImagePath = mod.ogArticleImage;
    } catch {
      /* no og article images */
    }
    let featuredArticleCards = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles-cards.generated.ts");
      featuredArticleCards = mod.featuredArticleCards || [];
    } catch {
      /* no generated article cards */
    }

    // والقوائم والاقتباسات في HTML الثابت، فلا تختلف النسختان.
    let parseArticleBlocks = (content) =>
      String(content || "")
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((text) => ({ type: "p", text: text.trim() }));
    let articleAdPositions = (paragraphCount, productCount) =>
      paragraphCount < 4 || productCount === 0
        ? []
        : productCount === 1 || paragraphCount < 8
          ? [{ index: Math.floor(paragraphCount / 2), productIndex: 0 }]
          : [
              { index: Math.floor(paragraphCount / 3), productIndex: 0 },
              { index: Math.floor((paragraphCount * 2) / 3), productIndex: 1 },
            ];
    try {
      const mod = await vite.ssrLoadModule("/src/lib/article-blocks.ts");
      parseArticleBlocks = mod.parseArticleBlocks;
      articleAdPositions = mod.articleAdPositions;
    } catch {
      /* fallback: فقرات مسطّحة */
    }

    let seoLandingPages = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/landing-pages.ts");
      seoLandingPages = mod.seoLandingPages || [];
    } catch {
      /* no landing pages */
    }

    // ينعكس هنا تلقائياً وتستحيل الروابط الميتة الجماعية عبر مئات الصفحات.
    seoNavLinks = [
      ...NAV_CORE,
      ...seoLandingPages
        .filter((p) => !p.noindex)
        .slice(0, 20)
        .map((p) => [`/products/guides/${p.slug}`, navPhrase(p.metaTitle || p.title || p.slug)]),
      ...articles.slice(0, 4).map((a) => [`/education/${a.slug}`, navPhrase(a.title)]),
    ];

    const { alternatesFor, enHome, enCategories } =
      await vite.ssrLoadModule("/src/data/en-pages.ts");

    const { fitSerpTitle } = await vite.ssrLoadModule("/src/lib/serp-title.ts");

    // (قابل للزحف من غير JS) — نفس محتوى TopicHub في الـ SPA.
    let TOPICS = [];
    let topicForArticle = () => undefined;
    let topicForGuide = () => undefined;
    let topicForProduct = () => undefined;
    let pillarPath = (t) =>
      t.pillarKind === "article"
        ? `/education/${t.pillarSlug}`
        : `/products/guides/${t.pillarSlug}`;
    let isPillarPath = () => false;
    try {
      const topicsMod = await vite.ssrLoadModule("/src/data/topics.ts");
      TOPICS = topicsMod.TOPICS || [];
      topicForArticle = topicsMod.topicForArticle;
      topicForGuide = topicsMod.topicForGuide;
      topicForProduct = topicsMod.topicForProduct;
      pillarPath = topicsMod.pillarPath;
      isPillarPath = topicsMod.isPillarPath;
    } catch {
      /* topics غير متاح — صفحات من غير روابط موضوعات */
    }

    const articleTitleOf = (slug) => (articles.find((a) => a.slug === slug) || {}).title || slug;
    const guideTitleOf = (slug) =>
      (seoLandingPages.find((p) => p.slug === slug) || {}).title || slug;
    const productNameOf = (id) => (products.find((p) => p.id === id) || {}).name || id;
    const productSlugOf = (id) => (products.find((p) => p.id === id) || {}).slug;

    /**
     * يبني HTML روابط الموضوعات للصفحة الحالية (static/crawler):
     *  • الـ pillar  ← "موضوع كامل": مقالات + أدلة + منتجات
     *  • satellite   ← "ارجع للدليل الشامل"
     *  • كلهم       ← "مواضيع مرتبطة" (3)
     */
    function topicLinksHtml(selfKind, selfSlug) {
      if (TOPICS.length === 0) return "";
      let topic;
      if (selfKind === "article") topic = topicForArticle(selfSlug);
      else if (selfKind === "guide") topic = topicForGuide(selfSlug);
      else if (selfKind === "product") topic = topicForProduct(selfSlug);
      if (!topic) return "";
      const selfPath =
        selfKind === "article"
          ? `/education/${selfSlug}`
          : selfKind === "guide"
            ? `/products/guides/${selfSlug}`
            : `/products/${productSlugOf(selfSlug) || selfSlug}`;
      const isPillar = isPillarPath(selfPath);
      const parts = [];

      if (!isPillar) {
        parts.push(
          // «مواضيع مرتبطة» فقط لغير الـ pillar) — يبقى الرابط كنص بلا h2.
          `<p><a href="${SITE_URL}${pillarPath(topic)}">ارجع للدليل الشامل: ${esc(topic.pillarTitle)}</a></p>`,
        );
      } else {
        const cols = [];
        const aLinks = topic.articleSlugs
          .filter((s) => s !== selfSlug)
          .map((s) => `<li><a href="${SITE_URL}/education/${s}">${esc(articleTitleOf(s))}</a></li>`)
          .join("");
        const gLinks = topic.guideSlugs
          .filter((s) => s !== selfSlug)
          .map(
            (s) =>
              `<li><a href="${SITE_URL}/products/guides/${s}">${esc(guideTitleOf(s))}</a></li>`,
          )
          .join("");
        const pLinks = topic.productIds
          .filter((id) => id !== selfSlug)
          .map((id) => {
            const slug = productSlugOf(id);
            return slug
              ? `<li><a href="${SITE_URL}/products/${slug}">${esc(productNameOf(id))}</a></li>`
              : "";
          })
          .slice(0, 8)
          .join("");
        if (aLinks) cols.push(`<div><h3>مقالات موثقة</h3><ul>${aLinks}</ul></div>`);
        if (gLinks) cols.push(`<div><h3>أدلة عملية</h3><ul>${gLinks}</ul></div>`);
        if (pLinks) cols.push(`<div><h3>منتجات مختارة</h3><ul>${pLinks}</ul></div>`);
        if (cols.length) {
          parts.push(
            `<h2>${esc(topic.emoji || "")}موضوع ${esc(topic.name)} كامل</h2>${cols.join("")}`,
          );
        }
      }

      const related = TOPICS.filter((t) => t.id !== topic.id).slice(0, 3);
      if (related.length) {
        const items = related
          .map(
            (t) =>
              `<li><h3><a href="${SITE_URL}${pillarPath(t)}">${esc(t.pillarTitle)}</a></h3></li>`,
          )
          .join("");
        parts.push(`<h2>مواضيع مرتبطة</h2><ul>${items}</ul>`);
      }
      return `<section>${parts.join("\n")}</section>`;
    }

    /* ========== 1) Home page ========== */
    {
      const title = "شركة مصرية متخصصة في منتجات الصحة والسعادة الزوجية";
      const desc =
        "متجر الصحة الزوجية في مصر: مكوّن واستخدام وتحذير مكتوب لكل منتج، أسعار معلنة بالجنيه، تغليف محايد بلا اسم منتج، دفع عند الاستلام، وشحن لكل المحافظات.";
      // The hydrated home route renders featured product cards and featured
      // article cards; the static copy must name the same items so a
      // no-JS/crawler visit is not a smaller or different page than the real
      // one, and so the strongest internal links exist in the initial HTML.
      // نفس عدد البطاقات المعروضة فعليًا في الرئيسية (صف واحد على الديسكتوب).
      const homeFeatured = getFeaturedProducts().slice(0, 4);
      const homeFeaturedBody = homeFeatured.length
        ? `<h2>أكثر ما يُطلب هذا الشهر</h2><p>أربعة منتجات تغطي أكثر الاحتياجات تكرارًا في الطلبات، تُفتح صفحة كل واحد منها بمكوّناته وتحذيره قبل الشراء.</p><ul>${homeFeatured
            .map(
              (p) =>
                `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a>، ${p.price} ج.م</li>`,
            )
            .join("")}</ul>`
        : "";
      const homeArticlesBody = featuredArticleCards.length
        ? `<h2>مكتبة التوعية</h2><p>مقالات تُشرح فيها المشكلة وخيارات التعامل معها، بمصادر مذكورة في نهاية كل مقال وقسم صريح لتحذيرات الاستخدام.</p><ul>${featuredArticleCards
            .map(
              (a) =>
                `<li><a href="${SITE_URL}/education/${a.slug}">${esc(a.title)}</a>، ${esc(a.category)}، ${a.readMin} دقائق قراءة</li>`,
            )
            .join(
              "",
            )}</ul><p><a href="${SITE_URL}/education">باقي المقالات في المكتبة (${articles.length} مقالة)</a></p>`
        : "";
      // "أبرز فئات العناية والاهتمام" (ShopByConcern) uses the same shared
      // candidate source and the same featured/excluded filters as React.
      const featuredIds = new Set(homeFeatured.map((p) => p.id));
      const homeConcerns = [
        { label: "علاجات التأخير", link: "/products/men", ids: HOMEPAGE_CONCERN_CANDIDATES.delay },
        {
          label: "القوة والأداء",
          link: "/products/men",
          ids: HOMEPAGE_CONCERN_CANDIDATES.strength,
        },
        {
          label: "أجهزة طبية",
          link: "/products/devices",
          ids: HOMEPAGE_CONCERN_CANDIDATES.devices,
        },
        {
          label: "الرغبة والإثارة للنساء",
          link: "/products/women",
          ids: HOMEPAGE_CONCERN_CANDIDATES.women,
        },
      ].map((concern) => ({
        ...concern,
        products: concern.ids
          .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
          .slice(0, 3)
          .map(getProductById)
          .filter(Boolean),
      }));
      const homeConcernBody = `<h2>احتياجك هو نقطة البداية</h2><p>ثلاثة اختيارات تحت كل احتياج، وكل منتج منها بصفحة تقول مكوّناته وطريقة استخدامه وتحذيره قبل أي وعد.</p>${homeConcerns
        .map(
          (concern) =>
            `<section><h3>${esc(concern.label)}</h3><ul>${concern.products
              .map((p) => `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a></li>`)
              .join(
                "",
              )}</ul><p><a href="${SITE_URL}${concern.link}">الباقي من «${esc(concern.label)}»</a></p></section>`,
        )
        .join("")}`;
      let html = buildHtml(template, {
        title,
        description: desc,
        image: `${SITE_URL}/og-default.jpg`,
        canonical: `${SITE_URL}/`,
        type: "website",
        // منتج في «فترينة» الرأس — نُعلنها preload بدل صورة قديمة غير مستخدمة.
        preloadImage: homeFeatured[0]?.image
          ? assetUrl(homeFeatured[0].image.replace("/images/", "/images/thumbs/"))
          : "",
        hreflang: alternatesFor("/"),
        imageAlt: "الإخلاص ميديكال | شركة مصرية متخصصة في منتجات الصحة والسعادة الزوجية",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website-search`,
            url: SITE_URL,
            name: "الإخلاص ميديكال",
            alternateName: ["الإخلاص للسعادة الزوجية", "Al Ikhlas Medical", "AL IKHLAS MEDICAL"],
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                // البحث الشامل (كل الفئات) — نفس القالب المُعلَن في الـ sitemap
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ],
        bodyContent: `<h1>الصحة والسعادة الزوجية بخصوصية كاملة</h1>
<p>${esc(desc)}</p>
<p>الكتالوج مقسّم ثلاثة أقسام للرجال والنساء والأجهزة، لكن الاختيار يبدأ من سؤال: ما الذي تحتاجه فعلًا؟ لهذا تُكتب صفحة كل منتج بما يفعله وما لا يفعله، وبتحذيره قبل فائدته، ومكوّناته كما هي على العبوة.</p>
<p>الطلب يبدأ بمحادثة: نؤكد الاسم والعنوان والمحافظة ونوضح الشحن قبل الدفع، وتخرج الشحنة في كرتونة سادة لا تحمل اسم منتج ولا وصفًا، والبيان الظاهر للمندوب لا يتجاوز ما يلزم للتسليم.</p>
<h2>الأقسام الثلاثة ومتى يتجه كل شخص لأيها</h2>
<ul>
  <li><a href="${SITE_URL}/products/men">منتجات الرجال</a>، مكمّلات وعسل وبخاخات وجل موضعي، كلٌّ بوصفه واستخدامه</li>
  <li><a href="${SITE_URL}/products/women">منتجات النساء</a>، قطرات وعسل وترطيب مختارة لسعادة المرأة وراحتها</li>
  <li><a href="${SITE_URL}/products/devices">الأجهزة والمستلزمات</a>، مضخات تفريغ وأجهزة شد وأدوات مساعدة ميكانيكية</li>
  <li><a href="${SITE_URL}/education">مكتبة التوعية</a>، مقالات وأدلة بمصادر مذكورة وتحذيرات صريحة</li>
</ul>
${homeFeaturedBody}
${homeConcernBody}
${homeArticlesBody}
<h2>ما تحصل عليه قبل أن تدفع</h2>
<ul>
  <li>صفحة منتج تذكر المكوّن وطريقة الاستخدام والتحذير، لا مدحًا بلا تفاصيل</li>
  <li>عبوة محايدة وبيان شحن لا يكشفان نوع الطلب</li>
  <li>سعر نهائي وشحن واضح في السلة قبل التأكيد</li>
  <li>شحن لكل محافظات مصر ومتابعة حتى التسليم</li>
  <li>محتوى توعوي بمصادر مذكورة، وبلا وعود علاجية</li>
</ul>`,
      });
      // The home LCP image is preloaded above via `preloadImage` (the first
      // showcase product) — a duplicate preload would trigger unused-preload warnings.
      writeFileSync(resolve(DIST, "index.html"), html);
      staticCount++;
    }

    /* ========== 2) Static routes ========== */
    // Keep category fallback FAQs byte-for-byte aligned with the React routes;
    // these answers are visible in the hydrated accordion and in the static
    // fallback/FAQ schema.

    // DEVICES_CATEGORY_FAQS في src/routes/products.devices.tsx حرفياً.

    // ومقدمة مكتبة التوعية: النص الوحيد لها في
    // `src/data/policy-pages.ts` و`src/data/education-hub.ts`، وما هنا
    // ترجمة للأقسام إلى HTML للزاحف. لا تُكتب نصوص هذه الصفحات في هذا الملف.
    const policyMod = await vite.ssrLoadModule("/src/data/policy-pages.ts");
    const policyFormat = await vite.ssrLoadModule("/src/lib/policy-format.ts");
    const educationMod = await vite.ssrLoadModule("/src/data/education-hub.ts");
    const categoryMod = await vite.ssrLoadModule("/src/data/category-pages.ts");
    const priceMod = {
      ...(await vite.ssrLoadModule("/src/data/price-list.ts")),
      ...(await vite.ssrLoadModule("/src/data/price-page-copy.ts")),
    };
    // جدول الأسعار: نفس صفوف الواجهة (بلا سعر مكتوب في هذا الملف).
    const priceTableHtml = (rows) =>
      `<table><thead><tr><th>المنتج</th><th>الشكل</th><th>السعر</th></tr></thead><tbody>${rows
        .map(
          (row) =>
            `<tr><td><a href="${SITE_URL}/products/${row.slug}">${esc(row.name)}</a></td>` +
            `<td>${esc(row.family)}</td><td>${esc(row.priceLabel)}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    const productCopyMod = await vite.ssrLoadModule("/src/data/product-page-copy.ts");
    const PC = productCopyMod.productPageCopy;
    const { POLICY_META: policyMeta } = await vite.ssrLoadModule("/src/data/policy-meta.ts");
    const policySegmentsHtml = (text) =>
      policyFormat
        .policySegments(text)
        .map((seg) =>
          seg.kind === "text"
            ? esc(seg.value)
            : `<a href="${SITE_URL}${seg.path}">${esc(seg.label)}</a>`,
        )
        .join("");
    const sectionsHtml = (sections) =>
      sections
        .map(
          (section) =>
            `<h2>${esc(section.heading)}</h2>` +
            (section.intro ? `<p><strong>${policySegmentsHtml(section.intro)}</strong></p>` : "") +
            (section.paragraphs ?? [])
              .map((paragraph) => `<p>${policySegmentsHtml(paragraph)}</p>`)
              .join("") +
            ((section.bullets ?? []).length
              ? `<ul>${section.bullets
                  .map((bullet) => `<li>${policySegmentsHtml(bullet)}</li>`)
                  .join("")}</ul>`
              : "") +
            ((section.cards ?? []).length
              ? `<ul>${section.cards
                  .map(
                    (card) =>
                      `<li><strong>${esc(card.title)}</strong>` +
                      (card.meta ? `، ${esc(card.meta)}` : "") +
                      `: ${policySegmentsHtml(card.text)}</li>`,
                  )
                  .join("")}</ul>`
              : ""),
        )
        .join("");
    const staticRoutes = [
      ...["men", "women", "devices"].map((key) => {
        const categoryPage = categoryMod.getCategoryPage(key);
        return {
          path: categoryPage.path,
          title: categoryPage.metaTitle,
          desc: categoryPage.metaDescription,
          h1: categoryPage.title,
          breadcrumbLabel: categoryPage.breadcrumbLabel,
          bodyDescription: categoryPage.description,
          faqs: categoryPage.faqs,
          faqTitle: categoryPage.faqTitle,
        };
      }),
      {
        path: priceMod.PRICE_PAGE.path,
        title: priceMod.PRICE_PAGE.metaTitle,
        desc: priceMod.PRICE_PAGE.metaDescription,
        h1: priceMod.PRICE_PAGE.title,
        breadcrumbLabel: "الأسعار",
        bodyDescription:
          "كل الأسعار في جدول واحد، من الأرخص للأعلى، بنفس الأرقام الموجودة في صفحات المنتجات، بلا «تواصل معنا للسعر» وبلا سعر يتغيّر بعد الطلب.",
        faqs: priceMod.priceFaqs,
        faqTitle: "أسئلة عن الأسعار والدفع",
        noWebPage: true,
        extraJsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE_URL}${priceMod.PRICE_PAGE.path}`,
            name: priceMod.PRICE_PAGE.title,
            description: priceMod.PRICE_PAGE.metaDescription,
            inLanguage: "ar-EG",
            url: `${SITE_URL}${priceMod.PRICE_PAGE.path}`,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: priceMod.priceRange.count,
              itemListElement: priceMod.priceGroups.flatMap((group) =>
                group.rows.map((row) => ({
                  "@type": "ListItem",
                  url: `${SITE_URL}/products/${row.slug}`,
                  name: row.name,
                })),
              ),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "الأسعار",
                item: `${SITE_URL}${priceMod.PRICE_PAGE.path}`,
              },
            ],
          },
        ],
        body:
          `<h2>جدول الأسعار كاملًا</h2>` +
          `<p>الأرقام أدناه هي نفس الأسعار المعلنة في صفحة كل منتج، مرتبة من الأرخص للأعلى داخل كل قسم. ` +
          `الشحن يُحسب حسب المحافظة ويظهر في السلة قبل التأكيد.</p>` +
          priceMod.priceGroups
            .map(
              (group) =>
                `<h3>${esc(group.label)} (${group.rows.length})</h3>` +
                `<p><a href="${SITE_URL}${group.href}">القسم كاملًا</a></p>` +
                priceTableHtml(group.rows),
            )
            .join(""),
      },
      {
        path: "/education",
        title: educationMod.educationHub.metaTitle,
        desc: educationMod.educationHub.metaDescription,
        h1: "إرشادات المختصين، مكتبة التوعية",
        bodyDescription:
          "مقالات توعوية مع مصادر واضحة تساعدك على فهم جسدك وعلاقاتك بشكل صحي وآمن. معرفتك هي الخطوة الأولى نحو راحة وثقة أكبر.",
        body: sectionsHtml(educationMod.educationHub.sections),
      },
      {
        // صفحة فهرس الأدلة: نفس النصوص والأسئلة التي تعرضها الـ route بعد الـ hydration،
        // وتُبنى من نفس ملف الأدلة فلا تتأخر عن أي دليل جديد.
        path: "/products/guides",
        title: "دليل الاختيار | الإخلاص ميديكال",
        desc: "قائمة بدليل الاختيار كامل في الإخلاص ميديكال: شكل المنتج، الأجهزة، الأجهزة المساعدة، والعبوات. كل دليل يشرح الفرق العملي والتحذيرات ومتى تسأل مختصًا.",
        h1: "دليل الاختيار: كل ما تحتاجه قبل أن تقرر",
        bodyDescription:
          "كل دليل يبدأ من سؤال واحد يصلنا من العملاء، ويجيب عليه بالترتيب: الفرق العملي، ثم طريقة الاستخدام، ثم التحذيرات، ثم متى تسأل مختصًا.",
        noWebPage: true,
        extraJsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE_URL}/products/guides`,
            name: "دليل الاختيار: كل ما تحتاجه قبل أن تقرر",
            description:
              "قائمة بدليل الاختيار كامل في الإخلاص ميديكال مع شرح الفرق العملي والتحذيرات في كل دليل.",
            inLanguage: "ar-EG",
            url: `${SITE_URL}/products/guides`,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: seoLandingPages.filter((p) => !p.noindex).length,
              itemListElement: seoLandingPages
                .filter((p) => !p.noindex)
                .map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/products/guides/${p.slug}`,
                  name: p.title,
                })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "دليل الاختيار",
                item: `${SITE_URL}/products/guides`,
              },
            ],
          },
        ],
        body:
          `<h2>لماذا نكتب أدلة قبل أن نبيع؟</h2>` +
          `<p>كثير من الطلبات تأتي بسؤال مقلوب: «أي واحد أقوى؟». والجواب الصادق أن السؤال الأنفع هو: «أي شكل يناسب استخدامي؟». الدليل لا يبيع شكلًا بعينه، بل يوضّح الفرق في طريقة الاستخدام والكمية والتوقيت، حتى يعرف القارئ ما الذي يشتريه قبل أن يطلبه.</p>` +
          `<p>ولا نكتب وعدًا في أي دليل. كل صفحة تذكر حدود الشكل، ومن يجب أن يستبعده، وعلامات تستدعي التوقف ومراجعة مختص. المحتوى يُراجع مقابل المصادر المكتوبة في نهاية كل دليل، ويُحدَّث بتاريخ ظاهر أعلى قسم المصادر.</p>` +
          `<h2>الأدلة المتاحة (${seoLandingPages.filter((p) => !p.noindex).length})</h2>` +
          `<ul>${seoLandingPages
            .filter((p) => !p.noindex)
            .map(
              (p) =>
                `<li><h3><a href="${SITE_URL}/products/guides/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.metaDescription)}</p></li>`,
            )
            .join("")}</ul>` +
          `<h2>من الدليل إلى القسم المناسب</h2>` +
          `<p>بعد قراءة الدليل تعرف الشكل الذي يناسبك، فتبدأ من القسم المناسب بدل التنقل بين مئات العبوات بلا معيار.</p>` +
          `<ul><li><a href="${SITE_URL}/products/men">منتجات الرجال</a></li><li><a href="${SITE_URL}/products/women">منتجات النساء</a></li><li><a href="${SITE_URL}/products/devices">الأجهزة الطبية</a></li></ul>`,
      },
      // SPA client-only routes (need static HTML for cleanUrls + Vercel fallback)
      {
        path: "/cart",
        title: "سلة التسوق، الإخلاص ميديكال",
        desc: "سلة التسوق الخاصة بك في الإخلاص ميديكال. أكمل طلبك بسهولة عبر واتساب أو طلب مباشر مع خصومات متدرجة.",
        h1: "سلة التسوق",
        noindex: true,
      },
      {
        path: "/order-confirmed",
        title: "تم استلام طلبك، الإخلاص ميديكال",
        desc: "تم استلام طلبك بنجاح. سنتواصل معك قريباً لتأكيد التفاصيل والشحن.",
        h1: "تم استلام طلبك",
        noindex: true,
      },
      {
        path: "/wishlist",
        title: "المفضلة | الإخلاص ميديكال",
        desc: "قائمة المنتجات المفضلة في مكان واحد. اضغط على أيقونة القلب على أي بطاقة منتج لحفظه، ثم أكمل الطلب بسهولة.",
        h1: "المفضلة",
        noindex: true,
      },
      {
        path: "/search",
        title: "نتائج البحث، الإخلاص ميديكال",
        desc: "نتائج البحث في منتجات الإخلاص ميديكال | كل المنتجات رجالي ونساء وأجهزة في مكان واحد، بالاسم العربي أو الإنجليزي.",
        h1: "نتائج البحث",
        noindex: true,
      },
    ];

    const aboutMod = await vite.ssrLoadModule("/src/data/about-content.ts");
    const reviewMod = await vite.ssrLoadModule("/src/data/review-board-content.ts");
    for (const [trustPage, meta] of [
      [aboutMod.aboutPage, policyMeta.about],
      [reviewMod.reviewBoardPage, policyMeta["medical-review-board"]],
    ]) {
      staticRoutes.push({
        path: trustPage === aboutMod.aboutPage ? "/about" : "/medical-review-board",
        title: meta.title,
        desc: meta.description,
        h1: trustPage.title,
        bodyDescription: policyFormat.policyText(trustPage.heroDescription),
        body:
          (trustPage.updatedAt
            ? `<p>آخر تحديث للصفحة: ${policyFormat.formatPolicyDate(trustPage.updatedAt)}</p>`
            : "") +
          ((trustPage.stats ?? []).length
            ? `<ul>${trustPage.stats
                .map((stat) => `<li><strong>${esc(stat.value)}</strong> ${esc(stat.label)}</li>`)
                .join("")}</ul>`
            : "") +
          sectionsHtml(trustPage.sections),
      });
    }
    for (const policyPage of policyMod.policyPages) {
      staticRoutes.push({
        path: policyPage.path,
        title: policyPage.metaTitle,
        desc: policyPage.metaDescription,
        h1: policyPage.title,
        // استبدال الرموز ({{RETURN_DAYS}} …) قبل الحقن: نسخة الزاحف لا تعرض رموزًا خام.
        bodyDescription: policyFormat.policyText(policyPage.heroDescription),
        body:
          `<p>آخر تحديث للصفحة: ${policyFormat.formatPolicyDate(policyPage.updatedAt)}</p>` +
          sectionsHtml(policyPage.sections),
      });
    }

    for (const r of staticRoutes) {
      // Use the exact same category selector/order as the React route. A raw
      // products.filter() here used to put the prerendered links in a
      // different order from the hydrated cards and could include a product
      // in a different position after pinned/stock sorting.
      const catItems = r.path.includes("/products/men")
        ? getProductsByCategory("men")
        : r.path.includes("/products/women")
          ? getProductsByCategory("women")
          : r.path === "/products/devices"
            ? getProductsByCategory("devices")
            : [];

      const categoryType = r.path.endsWith("/men")
        ? "men"
        : r.path.endsWith("/women")
          ? "women"
          : r.path.endsWith("/devices")
            ? "devices"
            : null;
      const jsonLd = [];
      // Category routes clear every prerendered block after hydration and
      // re-inject ItemList + BreadcrumbList (+ FAQPage for men/women). Emitting
      // a WebPage node here instead meant the initial HTML and the rendered DOM
      // declared different structured data, so category pages get exactly the
      // nodes the SPA injects. Other static routes keep their WebPage node
      // because those routes neither clear nor re-inject JSON-LD.
      if (categoryType) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: r.breadcrumbLabel || r.h1,
              item: `${SITE_URL}${r.path}`,
            },
          ],
        });
      } else if (!r.noWebPage) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${SITE_URL}${r.path}`,
          name: r.title,
          description: r.desc,
          url: `${SITE_URL}${r.path}`,
          ...(r.webPageExtra || {}),
        });
      }

      const structuredCatItems = catItems;
      if (structuredCatItems.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          // نفس الاسم الذي يحقنه الـ route بعد الـ hydration
          // (itemListSchema(items, PAGE_TITLE)) — وليس عنوان السيو الذي يحمل
          // لاحقة العلامة، حتى تتطابق البيانات المنظمة الثابتة مع الحقيقية.
          name: r.h1 || r.title,
          numberOfItems: structuredCatItems.length,
          itemListElement: structuredCatItems.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/products/${p.slug}`,
            name: p.name,
            image: p.image ? `${SITE_URL}${p.image}` : undefined,
          })),
        });
      }

      if (Array.isArray(r.faqs) && r.faqs.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: r.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        });
      }

      // JSON-LD إضافي محدد للصفحة (مثلاً: كيان Person للمؤسس في /about)
      if (Array.isArray(r.extraJsonLd)) {
        jsonLd.push(...r.extraJsonLd);
      }

      const faqBody = Array.isArray(r.faqs)
        ? `<h2>${esc(r.faqTitle || "الأسئلة الشائعة")}</h2>${r.faqs
            .map((f) => `<p><strong>${esc(f.question)}</strong></p><p>${esc(f.answer)}</p>`)
            .join("")}`
        : "";

      // 🚀 روابط داخلية للمنتجات داخل HTML الثابت (crawler-visible)
      // لولا هذه الروابط لما وجد جوجل أي طريقة للوصول إلى صفحات المنتجات
      // الفردية، لأن قائمة المنتجات تُرسم عبر JavaScript (SPA) ولا يقرؤها
      // الزاحف. وجود روابط <a href="/products/..."> ثابتة يجعل كل منتج
      // "مكتشفاً" وقابلاً للفهرسة، ويربط صفحات الأقسام بمنتجاتها.
      // ⚠️ العنوان هنا لازم يكون نصاً نظيفاً (r.h1) وليس عنوان السيو (r.title):
      // r.title يحمل لاحقة العلامة («… | الإخلاص ميديكال») فينتج عنوان مكرر.
      const productLinksBody =
        catItems.length > 0
          ? `<p><strong>${esc(r.h1 || r.title)}، ${catItems.length} ${arabicCountNoun(catItems.length)}</strong></p><ul>${catItems
              .map(
                (p) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a>، ${p.price} ج.م${p.stock <= 0 ? "، نفد المخزون" : ""}${p.rating && p.reviews ? `، ${p.rating} (${p.reviews} تقييم سابق)` : ""}</li>`,
              )
              .join("")}</ul>`
          : "";

      // 🚀 روابط داخلية للمقالات في صفحة /education (crawler-visible)
      // صفحة الفهرس ترسم قائمة المقالات عبر JS (SPA) ولا يقرؤها الزاحف،
      // لذلك نضيف هنا قائمة روابط ثابتة لجميع المقالات حتى تكون كل مقالة
      // "مكتشفة" ومربوطة من الفهرس بمسار زحف حقيقي — كما فُعل مع المنتجات.
      const articleLinksBody =
        r.path === "/education" && articles.length > 0
          ? `<ul>${articles
              .map(
                (a) =>
                  `<li><h2><a href="${SITE_URL}/education/${a.slug}">${esc(a.title)}</a></h2>؛ ${esc(a.category)}، ${esc(a.excerpt)}، ${a.readMin} دقائق قراءة</li>`,
              )
              .join("")}</ul>`
          : "";

      const html = buildHtml(template, {
        title: r.title,
        description: r.desc,
        image: `${SITE_URL}/og-default.jpg`,
        canonical: `${SITE_URL}${r.path}`,
        type: "website",
        noindex: Boolean(r.noindex),
        hreflang: alternatesFor(r.path),
        jsonLd,
        imageAlt: r.title,
        preloadProducts: catItems,
        preloadImage:
          r.path === "/education" && articles[0]?.image ? assetUrl(articles[0].image) : "",
        // The visible SSG fallback carries the canonical H1 and is replaced
        // by the React route after boot. It is not a hidden crawler copy.
        bodyContent: `<h1>${esc(r.h1)}</h1><p>${esc(r.bodyDescription || r.desc)}</p>${r.body ? r.body : ""}${productLinksBody}${articleLinksBody}${faqBody}`,
      });

      // Write to dist/<path>.html (cleanUrls handles trailing-slash routing)
      const outPath = resolve(DIST, r.path.slice(1) + ".html");
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html);
      staticCount++;
      console.log(`✓ static  ${r.path}`);
    }

    /* ========== 3) Products ========== */
    const productsDir = resolve(DIST, "products");
    if (!existsSync(productsDir)) mkdirSync(productsDir, { recursive: true });

    for (const product of products) {
      // Same helper + default length as src/routes/products.$slug.tsx head().
      // تُنشر كما هي (اختبار seo.test.ts يحرس ذلك)، والحد 62 محفوظ للعناوين
      // التحريرية التي نكتبها نحن (مقالات/أدلة) حيث القرار بيد المحرر.
      const title = makeProductMetaTitle(product.name, 70, product.titleLatin);
      // 🎯 وصف غني بالبيانات الفريدة (السعر، الشحن، ومعلومات المنتج) لمنع Google من إعادة كتابته بوصف الموقع العام
      const desc = makeProductMetaDescription(product);
      // absoluteProductImage() in src/lib/seo.ts (the hydrated copy) appends the
      // same cache-busting suffix via assetUrl(); keep both URLs identical.
      const img = product.image
        ? `${SITE_URL}${assetUrl(product.image)}`
        : `${SITE_URL}/og-default.jpg`;
      const canonical = `${SITE_URL}/products/${product.slug}`;
      const productReviews = Number.isInteger(product.reviews) ? Math.max(0, product.reviews) : 0;
      const productRating = Number.isFinite(product.rating)
        ? Math.max(0, Math.min(5, product.rating))
        : 0;
      const hasLegacyRating = productReviews > 0 && productRating >= 1;
      const legacyList =
        getProductReviews(product.slug, product.category, VISIBLE_REVIEW_COUNT).reviews || [];
      const legacyReviewsHtml = legacyList.length
        ? `<h2>تجارب عملاء حقيقية</h2>` +
          legacyList
            .map((r) => `<p><strong>${esc(r.name)}</strong>، ${r.rating}/5: ${esc(r.text)}</p>`)
            .join("")
        : "";
      // حارس التكافؤ فور تباعد alternativeName).
      const productJsonLd = productSchema({
        ...product,
        approvedReviewSummary:
          product.rating && product.reviews
            ? { ratingValue: product.rating, reviewCount: product.reviews }
            : undefined,
      });

      // وتُصدر FAQPage JSON-LD — فلا يمكن أن تختلف السكيما عن الصفحة.
      const productFaqs = getProductFAQs(product);

      const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryMod.getCategoryPage(product.category).breadcrumbLabel,
            item: `${SITE_URL}/products/${product.category}`,
          },
          { "@type": "ListItem", position: 3, name: product.name, item: canonical },
        ],
      };

      const benefits = (product.benefits || [])
        .slice(0, 4)
        .map((b) => `<li>${esc(b)}</li>`)
        .join("");

      // اسم القسم + رابط القسم (crawler-visible)
      const categoryName = categoryMod.getCategoryPage(product.category).breadcrumbLabel;
      const categoryUrl = `${SITE_URL}/products/${product.category}`;

      // Keep related-product membership/order identical to the hydrated route:
      // React removes the two cross-sell members, applies the catalog sorter,
      // then takes four cards. The old prerender used the raw catalog prefix,
      // so 14 product pages showed different related products before hydration.
      // نفس المنتجات الأربعة. مصدر واحد = لا اختلاف بين HTML الثابت والمتصفح.
      const crossSells = getCrossSellsForProduct(product);
      const relatedProducts = relatedProductsFor(product, getProductsByCategory(product.category), {
        limit: 4,
        crossSellsOf: getCrossSellsForProduct,
      });
      const relatedBody =
        relatedProducts.length > 0
          ? `<h2>منتجات قد تعجبك أيضاً</h2><ul>${relatedProducts
              .map(
                (p) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}"><img src="${assetUrl(p.image)}" alt="${esc(p.name)}" title="${esc(p.name)}" width="240" height="240" loading="lazy" />${esc(p.name)}</a>، ${p.price} ج.م</li>`,
              )
              .join("")}</ul>`
          : "";

      const productArticleSlugs = getArticlesForProduct(product) || [];
      const productArticlesHtml = productArticleSlugs.length
        ? `<h2>مقالات تهمك</h2>` +
          productArticleSlugs
            .map(
              (slug) =>
                `<h3><a href="${SITE_URL}/education/${slug}">${esc(articleTitleOf(slug))}</a></h3>`,
            )
            .join("")
        : "";
      const bundleItems = [product, ...crossSells];
      const bundleTotal = bundleItems.reduce((sum, item) => sum + item.price, 0);
      const bundleDiscount = Math.round(bundleTotal * BUNDLE_DISCOUNT_RATE);
      const bundleBody =
        crossSells.length === 2
          ? `<section><h3>${esc(PC.bundleTitle)}</h3><p>${esc(PC.bundleLead(Math.round(BUNDLE_DISCOUNT_RATE * 100)))}</p><ul>${bundleItems
              .map(
                (p, index) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a>، ${p.price} ج.م${index === 0 ? "، المنتج الحالي" : ""}</li>`,
              )
              .join(
                "",
              )}</ul><p>الإجمالي العادي: ${bundleTotal} ج.م، سعر الباقة: ${bundleTotal - bundleDiscount} ج.م</p></section>`
          : "";

      const body = `
        <nav aria-label="Breadcrumb">
          <a href="${SITE_URL}/">الرئيسية</a> › <a href="${categoryUrl}">${esc(categoryName)}</a>
        </nav>
        <h1>${esc(product.name)}</h1>
        ${product.image ? `<img src="${assetUrl(product.image)}" alt="${esc(product.name)}" title="${esc(product.name)}" width="800" height="800" loading="eager" fetchpriority="high" style="display:block;width:100%;height:auto" />` : ""}
        <p><strong>${esc(product.nameEn || "")}</strong></p>
        <p>${esc(product.description)}</p>
        ${benefits ? `<ul>${benefits}</ul>` : ""}
        ${product.ingredients ? `<h2>المكونات / التركيبة</h2><p>${esc(product.ingredients)}</p>` : ""}
        ${product.usage ? `<h2>طريقة الاستخدام</h2><p>${esc(product.usage)}</p>` : ""}
        <p>السعر: ${product.price} ج.م</p>
        ${hasLegacyRating ? `<h2>آراء وتقييمات العملاء</h2><p>التقييم العام: ${productRating} من 5 (${productReviews} تقييم سابق).</p>` : ""}
        ${legacyReviewsHtml}
        <h3>${esc(PC.reviewTitle)}</h3>
        <p>${esc(PC.reviewLead)}</p>
        <p><a href="${categoryUrl}">صفحة القسم كاملة: ${esc(categoryName)}</a></p>
        ${bundleBody}
        <section><h2>الأسئلة الشائعة</h2>${productFaqs
          .map((faq) => `<p><strong>${esc(faq.question)}</strong></p><p>${esc(faq.answer)}</p>`)
          .join("")}</section>
        ${relatedBody}
        ${productArticlesHtml}
        ${topicLinksHtml("product", product.id)}
      `;

      const html = buildHtml(template, {
        title,
        description: desc,
        image: img,
        canonical,
        type: "product",
        noindex: false,
        jsonLd: [productJsonLd, breadcrumb, faqSchema(productFaqs)],
        bodyContent: body,
        imageAlt: product.name,
        // 🖼️ صورة المنتج الرئيسية هي عنصر LCP في هذه الصفحة، وهي تُرسم بواسطة
        // React بعد الترطيب — فبدون preload يبدأ تنزيلها متأخرًا. الإعلان عنها
        // هنا يجعلها في الكاش قبل أول رسم للـReact.
        preloadImage: product.image ? assetUrl(product.image) : "",
      });

      writeFileSync(resolve(DIST, "products", `${product.slug}.html`), html);
      productsCount++;
    }
    console.log(`✓ products: ${productsCount}`);

    /* ========== 4) Articles ========== */
    if (articles.length > 0) {
      const eduDir = resolve(DIST, "education");
      if (!existsSync(eduDir)) mkdirSync(eduDir, { recursive: true });

      for (const article of articles) {
        // 🎯 العنوان بلا لاحقة brand لتفادي تجاوز 65 حرفاً (الـ brand في schema).
        // تظهر مقتطعة في Google، فصار لكل مقالة عنوان عرض منفصل عن H1
        // (H1 وheadline يبقيان النص الكامل). لا اقتطاع هنا — القيمة بيد المحرر.
        const title = article.seoTitle ?? article.title;
        // 🎯 meta description مُقتطع (الـ excerpt قد يطُول أحياناً).
        const desc = makeMetaDescription(article.excerpt, 155, `/education/${article.slug}`);
        // Hydrated articleSchema() uses absoluteUrl() (no ?v= suffix).
        const img = article.image
          ? article.image.startsWith("http")
            ? article.image
            : `${SITE_URL}${article.image}`
          : `${SITE_URL}/og-default.jpg`;
        const canonical = `${SITE_URL}/education/${article.slug}`;

        // These are the same loaders/selectors used by the hydrated article
        // route. Keeping them here prevents the static copy from omitting
        // linked products/articles or showing a different recommendation set.
        const relatedSlugs = getRelatedArticles(article.slug, article.category, articles);
        const relatedArticles = relatedSlugs
          .map((slug) => articles.find((candidate) => candidate.slug === slug))
          .filter(Boolean);
        const linkedProducts = getProductsForArticle(article.slug)
          .map((id) => products.find((product) => product.id === id))
          .filter(Boolean)
          .slice(0, 6);

        const articleJsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: img,
          articleSection: article.category,
          timeRequired: `PT${article.readMin}M`,
          inLanguage: "ar-EG",
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          author: {
            "@type": "Organization",
            "@id": `${SITE_URL}/about#editorial-team`,
            name: article.author?.name || "فريق المحتوى الصحي، الإخلاص ميديكال",
            description: article.author?.credentials,
            url: `${SITE_URL}/about#editorial-team`,
            parentOrganization: { "@type": "Organization", name: "الإخلاص ميديكال", url: SITE_URL },
          },
          publisher: {
            "@type": "Organization",
            name: "الإخلاص ميديكال",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          reviewedBy: {
            "@type": "Person",
            name: article.reviewer?.name || siteConfig.MEDICAL_SUPERVISOR.name,
            jobTitle: article.reviewer?.role || siteConfig.MEDICAL_SUPERVISOR.role,
            url: `${SITE_URL}/medical-review-board`,
          },
          citation: (article.sources || []).map((source) => ({
            "@type": "CreativeWork",
            name: source.title,
            url: source.url,
            publisher: { "@type": "Organization", name: source.publisher },
          })),
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
        };

        const breadcrumb = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "المقالات", item: `${SITE_URL}/education` },
            { "@type": "ListItem", position: 3, name: article.title, item: canonical },
          ],
        };

        // يطابق ArticleContentWithAds عبر المحرّك المشترك نفسه.
        const articleBlocks = parseArticleBlocks(article.content || "");
        const paragraphCount = articleBlocks.filter((b) => b.type === "p").length;
        const adPositions = articleAdPositions(paragraphCount, linkedProducts.length);
        // 15 صفحة مقالة). البلوك هنا قسم مستقل أعلى مستوى داخل المقال، فهو h2
        // — العناصر h3 داخل الأقسام الأخرى تبقى كما هي.
        const articleAdHtml = (product) =>
          `<section><p>الحل المقترح</p><h2>${esc(product.name)}</h2><p>${esc(product.description)}</p><p><a href="${SITE_URL}/products/${product.slug}">عرض المنتج والشراء</a></p></section>`;
        let paragraphIndex = -1;
        const paragraphs = articleBlocks
          .map((block) => {
            if (block.type === "h2") return `<h2>${esc(block.text)}</h2>`;
            if (block.type === "h3") return `<h3>${esc(block.text)}</h3>`;
            if (block.type === "quote") return `<blockquote><p>${esc(block.text)}</p></blockquote>`;
            if (block.type === "ul")
              return `<ul>${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
            paragraphIndex += 1;
            const hit = adPositions.find((position) => position.index === paragraphIndex);
            const ad = hit ? linkedProducts[hit.productIndex] : undefined;
            return `<p>${esc(block.text)}</p>${ad ? articleAdHtml(ad) : ""}`;
          })
          .join("");

        const sourcesBody = (article.sources || [])
          .map(
            (source) =>
              `<li><a href="${esc(source.url)}" rel="nofollow noopener">${esc(source.title)}</a>، ${esc(source.publisher)}</li>`,
          )
          .join("");
        const linkedProductsBody = linkedProducts.length
          ? `<section><h2>منتجات ذات صلة</h2><ul>${linkedProducts
              .map(
                (product) =>
                  `<li><h3><a href="${SITE_URL}/products/${product.slug}">${esc(product.name)}</a></h3>، ${product.price} ج.م</li>`,
              )
              .join("")}</ul></section>`
          : "";
        const suggestedProductsBody = linkedProducts.length
          ? `<section><h2>منتجات تساعد في حل المشكلة</h2><p>منتجات مختارة ذات صلة بموضوع المقال، اقرأ صفحة كل منتج ومكوناته وتحذيراته قبل الشراء.</p><ul>${linkedProducts
              .slice(0, 4)
              .map(
                (product) =>
                  `<li><h3><a href="${SITE_URL}/products/${product.slug}">${esc(product.name)}</a></h3>، ${product.price} ج.م</li>`,
              )
              .join("")}</ul></section>`
          : "";
        const relatedArticlesBody =
          relatedArticles.length > 0
            ? `<section><h2>مقالات ذات صلة</h2><ul>${relatedArticles
                .map(
                  (related) =>
                    `<li><h3><a href="${SITE_URL}/education/${related.slug}">${esc(related.title)}</a></h3></li>`,
                )
                .join("")}</ul></section>`
            : "";

        const body = `
          <article>
            <h1>${esc(article.title)}</h1>
            <p><em>${esc(article.category)}، ${article.readMin} دقائق قراءة، آخر تحديث: ${esc(article.updatedAt || "")}</em></p>
            ${
              article.image
                ? `<figure><img src="${article.image.startsWith("http") ? article.image : assetUrl(article.image)}" alt="${esc(article.imageAlt || article.title)}" width="1280" height="720" loading="eager" fetchpriority="high" decoding="async" style="width:100%;height:auto;border-radius:16px;margin:16px 0" /></figure>`
                : ""
            }
            <p><strong>${esc(article.excerpt)}</strong></p>
            ${
              Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0
                ? `<section><p><strong>أهم النقاط</strong></p><ul>${article.keyTakeaways
                    .map((p) => `<li>${esc(p)}</li>`)
                    .join("")}</ul></section>`
                : ""
            }
            <section>
              <p>إعداد: ${esc(article.author?.name || "فريق المحتوى الصحي، الإخلاص ميديكال")}</p>
              <p>${esc(article.author?.credentials || "")}</p>
              <p>فحص آلي: ${esc(article.reviewer?.name || "فحص سلامة المحتوى، الإخلاص ميديكال")}</p>
              <p>${esc(article.reviewer?.credentials || "")}</p>
              <p>المقال للفهم العام: لا يُشخّص حالة قارئ بعينها ولا يصف دواءً، ومن يحتاج قرارًا علاجيًا يراجعه مع مختص يعرف تاريخه الصحي.</p>
            </section>
            ${paragraphs}
            <section>
              <h2>منهجية الثقة والمراجعة</h2>
              <ul>${editorialTrustSignals
                .map(
                  (signal) => `<li>${esc(typeof signal === "string" ? signal : signal.text)}</li>`,
                )
                .join("")}</ul>
            </section>
            <section>
              <h2>المصادر الطبية المستخدمة</h2>
              <p>المصادر أدناه هي ما استندنا إليه في هذا المقال تحديدًا، وليست قائمة عامة؛ وما يثبته بحث عن فكرة لا يثبت تلقائيًا فعالية منتج تجاري بعينه.</p>
              <ul>${sourcesBody}</ul>
            </section>
            <p>اقرأ ما سبق كمعلومة تُعينك على طرح السؤال الصحيح على مختص، لا كبديل عن زيارته.</p>
            ${linkedProductsBody}
            ${suggestedProductsBody}
            ${relatedArticlesBody}
            <p><a href="${SITE_URL}/education">← تصفح جميع المقالات التوعوية</a></p>
            ${topicLinksHtml("article", article.slug)}
          </article>
        `;

        const html = buildHtml(template, {
          title,
          description: desc,
          image: ogArticleImagePath(article.slug)
            ? `${SITE_URL}${ogArticleImagePath(article.slug)}`
            : img,
          canonical,
          type: "article",
          jsonLd: [articleJsonLd, breadcrumb],
          bodyContent: body,
          imageAlt: article.imageAlt || article.title,
        });

        writeFileSync(resolve(DIST, "education", `${article.slug}.html`), html);
        articlesCount++;
      }
      console.log(`✓ articles: ${articlesCount}`);
    }

    /* ========== 5) SEO landing guide pages ========== */
    if (seoLandingPages.length > 0) {
      const guidesDir = resolve(DIST, "products", "guides");
      if (!existsSync(guidesDir)) mkdirSync(guidesDir, { recursive: true });

      for (const page of seoLandingPages) {
        const canonical = `${SITE_URL}/products/guides/${page.slug}`;
        const selectedProducts = (page.productIds || [])
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean);
        const linkedArticleSlugs = getArticlesForLandingPage(page.slug, page.title);
        const linkedArticles = linkedArticleSlugs
          .map((slug) => articles.find((article) => article.slug === slug))
          .filter(Boolean);

        const webPageJsonLd = {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": canonical,
          name: page.title,
          headline: page.title,
          description: page.metaDescription,
          url: canonical,
          inLanguage: "ar-EG",
          about: page.primaryKeyword,
          ...(page.sources?.length ? { citation: page.sources.map((source) => source.url) } : {}),
          ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
        };

        const breadcrumb = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: "دليل الاختيار",
              item: `${SITE_URL}/products/guides`,
            },
            { "@type": "ListItem", position: 3, name: page.title, item: canonical },
          ],
        };

        const faqJsonLd = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (page.faqs || []).map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        };

        const itemList = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: page.title,
          numberOfItems: selectedProducts.length,
          itemListElement: selectedProducts.map((product, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/products/${product.slug}`,
            name: product.name,
            image: product.image ? `${SITE_URL}${product.image}` : undefined,
          })),
        };

        // الدليل نص تحريري طويل: يُوصف كـArticle (مثل المقالات) لا كصفحة تسويقية،
        // مع نسبة المحتوى لفريق التحرير والمصادر كاقتباسات — أوضح لمحركات البحث.
        const guideArticleJsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${canonical}#article`,
          headline: page.title,
          description: page.metaDescription,
          image: `${SITE_URL}/og-default.jpg`,
          inLanguage: "ar-EG",
          about: page.primaryKeyword,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          author: {
            "@type": "Organization",
            "@id": `${SITE_URL}/about#editorial-team`,
            name: "فريق المحتوى الصحي، الإخلاص ميديكال",
            url: `${SITE_URL}/about#editorial-team`,
            parentOrganization: { "@type": "Organization", name: "الإخلاص ميديكال", url: SITE_URL },
          },
          publisher: {
            "@type": "Organization",
            name: "الإخلاص ميديكال",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          ...(page.sources?.length
            ? {
                citation: page.sources.map((source) => ({
                  "@type": "CreativeWork",
                  name: source.title,
                  url: source.url,
                  publisher: { "@type": "Organization", name: source.publisher },
                })),
              }
            : {}),
          // الدليل لا يحمل تاريخ نشر مستقلًا في البيانات؛ تاريخ التحديث هو المرجع
          // الوحيد الموثّق، فيُستخدم للنشر والتعديل معًا بدل اختراع تاريخ.
          ...(page.updatedAt
            ? { datePublished: page.updatedAt, dateModified: page.updatedAt }
            : {}),
        };

        // بنفس ترتيب الشاشة (الفقرات ثم القائمة) حتى يقرأ الزاحف نفس النص الظاهر.
        const sections = (page.sections || [])
          .map((section) => {
            const paragraphs = (section.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("");
            const bullets = (section.bullets || []).length
              ? `<ul>${section.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
              : "";
            return `<h2>${esc(section.heading)}</h2><p>${esc(section.body)}</p>${paragraphs}${bullets}`;
          })
          .join("");
        const keyTakeaways = (page.keyTakeaways || []).length
          ? `<section><h2>أهم النقاط قبل أن تختار</h2><ul>${page.keyTakeaways
              .map((point) => `<li>${esc(point)}</li>`)
              .join("")}</ul></section>`
          : "";
        const comparison = page.comparison
          ? `<section aria-label="جدول مقارنة"><h2>${esc(page.comparison.caption)}</h2><p>اسحب الجدول أفقيًا لرؤية كل الأعمدة</p><table><thead><tr>${page.comparison.columns
              .map((column) => `<th scope="col">${esc(column)}</th>`)
              .join("")}</tr></thead><tbody>${page.comparison.rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell, cellIndex) =>
                      cellIndex === 0
                        ? `<th scope="row">${esc(cell)}</th>`
                        : `<td>${esc(cell)}</td>`,
                    )
                    .join("")}</tr>`,
              )
              .join("")}</tbody></table></section>`
          : "";
        const links = (page.links || [])
          .map(
            (link) =>
              `<li><h3><a href="${SITE_URL}${link.href}">${esc(link.label)}</a></h3>، ${esc(link.description)}</li>`,
          )
          .join("");
        const faqs = (page.faqs || [])
          .map((faq) => `<p><strong>${esc(faq.question)}</strong></p><p>${esc(faq.answer)}</p>`)
          .join("");
        const productsBody = selectedProducts
          .map(
            (product) =>
              `<li><a href="${SITE_URL}/products/${product.slug}"><img src="${assetUrl(product.image)}" alt="${esc(product.name)}" title="${esc(product.name)}" width="240" height="240" loading="lazy" />${esc(product.name)}</a>، ${product.price} ج.م</li>`,
          )
          .join("");
        const relatedKeywords = (page.relatedKeywords || [])
          .slice(0, 4)
          .map((keyword) => `<li>${esc(keyword)}</li>`)
          .join("");
        const linkedArticlesBody =
          linkedArticles.length > 0
            ? `<section><h2>مقالات تعليمية ذات صلة</h2><ul>${linkedArticles
                .map(
                  (article) =>
                    `<li><a href="${SITE_URL}/education/${article.slug}">${esc(article.title)}</a>، ${article.readMin} دقائق قراءة</li>`,
                )
                .join("")}</ul></section>`
            : "";

        const body = `
          <article>
            <p><a href="${SITE_URL}/">الرئيسية</a> / <a href="${SITE_URL}/products/guides">دليل الاختيار</a></p>
            <h1>${esc(page.title)}</h1>
            <p><strong>${esc(page.heroDescription)}</strong></p>
            <ul>${relatedKeywords}</ul>
            <p>${esc(page.intro)}</p>
            ${keyTakeaways}
            <section><p><strong>علامات الاختيار الواعي</strong></p><ul><li>اختيار واعٍ</li><li>شحن سري داخل مصر</li><li>تنبيه طبي واضح</li></ul></section>
            ${sections}
            ${comparison}
            ${page.sources?.length ? `<section aria-label="مصادر الدليل"><h2>المصادر والمراجع</h2>${page.updatedAt ? `<p>آخر تحديث للمحتوى: <time datetime="${esc(page.updatedAt)}">${esc(page.updatedAt)}</time></p>` : ""}<ol>${page.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>، ${esc(source.publisher)}</li>`).join("")}</ol></section>` : ""}
            <h2>ابدأ من الأقسام الحالية</h2>
            <ul>${links}</ul>
            ${selectedProducts.length > 0 ? `<h2>منتجات مختارة مرتبطة بالبحث</h2><ul>${productsBody}</ul>` : ""}
            ${linkedArticlesBody}
            <h2>أسئلة شائعة عن ${esc(page.primaryKeyword)}</h2>
            ${faqs}
            ${topicLinksHtml("guide", page.slug)}
          </article>
        `;

        const html = buildHtml(template, {
          // لاحقة العلامة التجارية تُحذف وحدها حين تتجاوز السقف (12 صفحة دليل).
          title: fitSerpTitle(page.metaTitle || page.title),
          description: page.metaDescription,
          image: `${SITE_URL}/og-default.jpg`,
          canonical,
          type: "article",
          noindex: Boolean(page.noindex),
          jsonLd: [webPageJsonLd, guideArticleJsonLd, breadcrumb, faqJsonLd, itemList],
          bodyContent: body,
          imageAlt: page.metaTitle,
        });

        writeFileSync(resolve(guidesDir, `${page.slug}.html`), html);
        landingCount++;
      }
      console.log(`✓ landing pages: ${landingCount}`);
    }

    // متبادل مع العربية. النصوص ترجمة أمينة لنصوص النسخة العربية (en-pages.ts).
    const enNav = [
      ["/en", "Home"],
      ["/en/products/men", "Men"],
      ["/en/products/women", "Women"],
      ["/en/products/devices", "Devices"],
      ["/", "العربية"],
    ];
    let enCount = 0;
    const enDir = resolve(DIST, "en");
    mkdirSync(resolve(enDir, "products"), { recursive: true });
    const hubHtml = buildHtml(template, {
      title: enHome.title,
      description: enHome.description,
      image: `${SITE_URL}/og-default.jpg`,
      canonical: `${SITE_URL}/en`,
      type: "website",
      lang: "en",
      dir: "ltr",
      locale: "en_US",
      hreflang: alternatesFor("/en"),
      navLinks: enNav,
      // المنشورة (ترجمة) ويُتيح ظهور النتائج الغنية بالإنجليزية.
      jsonLd: [
        breadcrumbSchema([{ name: "Home", url: "/en" }]),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (enHome.faqs || []).map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        },
      ],
      imageAlt: enHome.title,
      bodyContent:
        `<h1>${esc(enHome.h1)}</h1><p>${esc(enHome.intro)}</p>` +
        `<h2>${esc(enHome.storyTitle ?? "")}</h2>` +
        (enHome.story ?? []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("") +
        `<h2>${esc(enHome.browseLabel)}</h2><ul>${enCategories
          .map((c) => `<li><a href="${SITE_URL}${c.path}">${esc(c.heroTitle)}</a></li>`)
          .join("")}</ul>` +
        // كُتَل المحتوى الجديدة: خطوات الطلب + الضمانات + الأسئلة الشائعة.
        `<h2>${esc(enHome.howTitle)}</h2>` +
        (enHome.steps || [])
          .map((step) => `<h3>${esc(step.title)}</h3><p>${esc(step.text)}</p>`)
          .join("") +
        `<h2>${esc(enHome.assuranceTitle)}</h2><ul>${(enHome.assurances || [])
          .map((item) => `<li>${esc(item)}</li>`)
          .join("")}</ul>` +
        `<h2>${esc(enHome.faqTitle)}</h2>` +
        (enHome.faqs || [])
          .map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`)
          .join("") +
        `<p>${esc(enHome.noteLabel)} <a href="${SITE_URL}/">النسخة العربية</a></p>`,
    });
    writeFileSync(resolve(enDir, "index.html"), hubHtml);
    enCount++;

    for (const page of enCategories) {
      const items = getPublicProductsByCategory(page.category);
      const html = buildHtml(template, {
        title: page.title,
        description: page.description,
        image: `${SITE_URL}/og-default.jpg`,
        canonical: `${SITE_URL}${page.path}`,
        type: "website",
        lang: "en",
        dir: "ltr",
        locale: "en_US",
        hreflang: alternatesFor(page.path),
        navLinks: enNav,
        jsonLd: [
          itemListSchema(
            items.map((p) => ({
              id: p.id,
              name: p.nameEn,
              slug: p.slug,
              image: p.image,
              price: p.price,
            })),
            page.heroTitle,
          ),
          breadcrumbSchema([
            { name: "Home", url: "/en" },
            { name: page.heroTitle, url: page.path },
          ]),
          faqSchema(page.faqs),
        ],
        imageAlt: page.heroTitle,
        bodyContent:
          `<h1>${esc(page.heroTitle)}</h1><p>${esc(page.heroDescription)}</p>` +
          `<p><a href="${SITE_URL}${page.arPath}">View this page in Arabic، عرض هذه الصفحة بالعربية</a></p>` +
          `<h2>${esc(page.listLabel)}</h2><ul>${items
            .map(
              (p) =>
                `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.nameEn)}</a>، EGP ${p.price}</li>`,
            )
            .join("")}</ul>` +
          (page.guide ?? [])
            .map(
              (section) =>
                `<h2>${esc(section.title)}</h2>` +
                section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("") +
                (section.bullets
                  ? `<ul>${section.bullets.map((bullet) => `<li>${esc(bullet)}</li>`).join("")}</ul>`
                  : ""),
            )
            .join("") +
          `<h2>Frequently asked questions about ${esc(page.heroTitle)}</h2>${page.faqs
            .map((f) => `<p><strong>${esc(f.question)}</strong></p><p>${esc(f.answer)}</p>`)
            .join("")}`,
      });
      writeFileSync(resolve(enDir, "products", `${page.category}.html`), html);
      enCount++;
    }
    console.log(`✓ english pages: ${enCount}`);

    // 🚨 حارس الرموز: أي `{{TOKEN}}` يصل إلى صفحة منشورة يعني نصًا خامًا
    // يراه الزائر والزاحف (حدث فعلًا مع {{RETURN_DAYS}} في /returns).
    // البناء يفشل الآن بدل نشر الرمز.
    const leakedTokens = [];
    for (const file of readdirSync(DIST, { recursive: true })) {
      const name = String(file);
      if (!name.endsWith(".html")) continue;
      const content = readFileSync(resolve(DIST, name), "utf-8");
      const hits = [...new Set(content.match(/\{\{[A-Z0-9_]+\}\}/g) || [])];
      if (hits.length > 0) leakedTokens.push(`${name}: ${hits.join(" ")}`);
    }
    if (leakedTokens.length > 0) {
      console.error("\n❌ رموز غير مُستبدلة في صفحات منشورة:");
      for (const line of leakedTokens.slice(0, 20)) console.error(`    · ${line}`);
      throw new Error(`${leakedTokens.length} صفحة تحتوي رموز {{…}} خام`);
    }

    console.log(
      `\n✅ Prerender complete: ${staticCount} static + ${productsCount} products + ${articlesCount} articles + ${landingCount} landing pages + ${enCount} en = ${staticCount + productsCount + articlesCount + landingCount + enCount} pages`,
    );

    // الوصف المقتطع بـ «…» يظهر في نتائج Google بنص ناقص — التصحيح الصحيح هو
    // صامتاً تماماً قبل هذا التحذير.
    if (TRUNCATED_META.length > 0) {
      console.warn(
        `\n⚠️  ${TRUNCATED_META.length} meta description اقتُطع بـ «…» أثناء البناء، قصّر النص في المصدر:`,
      );
      for (const t of TRUNCATED_META.slice(0, 20))
        console.warn(`    · ${t.route}، ${t.length} حرف (الحد ${t.maxLength}) ${t.preview}`);
    }
  } finally {
    await vite.close();
  }
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
