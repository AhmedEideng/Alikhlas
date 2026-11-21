import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();

function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

try {
  const {
    products,
    getFeaturedProducts,
    HOMEPAGE_EXCLUDED_PRODUCT_IDS,
    HOMEPAGE_CONCERN_CANDIDATES,
    getHomepageTabCards,
    HOMEPAGE_TAB_CATEGORIES,
    getProductFamily,
    getOralSolidForm,
    getBundlePresentation,
    getBundleProductType,
  } = await vite.ssrLoadModule("/src/data/products.ts");
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const { getProductFAQs } = await vite.ssrLoadModule("/src/data/product-faqs.ts");
  for (const product of products) {
    const questions = getProductFAQs(product).map((faq) => faq.question);
    assert.equal(
      new Set(questions).size,
      questions.length,
      `Duplicate FAQ questions: ${product.id}`,
    );
  }
  const { seoLandingPages } = await vite.ssrLoadModule("/src/data/landing-pages.ts");
  const promo = await vite.ssrLoadModule("/src/lib/promo.ts");
  const bundle = await vite.ssrLoadModule("/src/lib/bundle-discount.ts");
  const siteConfig = await vite.ssrLoadModule("/src/lib/site-config.ts");
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
  const dockerfile = readFileSync(resolve(ROOT, "Dockerfile"), "utf-8");
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/config \.\/config/,
    "Docker runtime must include config/ because server/index.js imports security-headers.mjs",
  );
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/vercel\.json \.\/vercel\.json/,
    "Docker runtime must include vercel.json for self-hosted redirect parity",
  );
  const productsDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/products-db.json"), "utf-8"));
  const configDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/config-db.json"), "utf-8"));
  const cacheConfig = JSON.parse(readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"));
  const cacheModule = await vite.ssrLoadModule("/src/lib/cache.ts");
  const { makeProductMetaDescription } = await vite.ssrLoadModule("/src/lib/seo.ts");
  const { PRODUCT_META_PROFILES } = await vite.ssrLoadModule("/src/data/product-meta.ts");
  const { isMerchantFeedExcluded } = await vite.ssrLoadModule("/src/lib/site-config.ts");
  assert.equal(cacheModule.CACHE_VERSION, cacheConfig.version, "Cache version source mismatch");
  {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
    const lock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf-8"));
    assert.equal(
      lock.version,
      pkg.version,
      `package-lock.json version ${lock.version} != package.json ${pkg.version} (run: npm install or a release)`,
    );
    assert.equal(
      lock.packages?.[""]?.version,
      pkg.version,
      `package-lock.json root package version ${lock.packages?.[""]?.version} != package.json ${pkg.version}`,
    );
  }
  for (const script of ["scripts/prerender-seo.mjs", "scripts/generate-sitemap.mjs"]) {
    const content = readFileSync(resolve(ROOT, script), "utf-8");
    assert.doesNotMatch(
      content,
      /CACHE_VERSION\s*=\s*"\d+"/,
      `Duplicate cache version in ${script}`,
    );
  }
  // The prerender fallback must be real visible HTML, never a clipped
  // crawler-only copy. This protects the SEO/UX contract from regression.
  {
    const prerender = readFileSync(resolve(ROOT, "scripts/prerender-seo.mjs"), "utf-8");
    // والحارس الآن يثبت وجود السمة + بقاء الافتراض العربي rtl.
    assert.match(prerender, /data-prerender-content dir="\$\{dir\}"/);
    assert.match(prerender, /dir = "rtl"/);
    assert.doesNotMatch(prerender, /data-prerender-content[^>]*clip:/);
    assert.doesNotMatch(prerender, /ikhlas-prerender-shell/);
  }
  // GA4 must configure before the SPA emits events, and the browser must
  // load the same versioned loader referenced by the HTML template.
  {
    const gaLoader = readFileSync(resolve(ROOT, "public/scripts/ga-loader.js"), "utf-8");
    const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    assert.match(indexHtml, /\/scripts\/ga-loader\.js\?v=\d+/);
    // it, but a broad restore commit once left it one ahead of the central config
    // (config=85, index.html=86) and every built page inherited the stale number.
    const gaVersion = indexHtml.match(/\/scripts\/ga-loader\.js\?v=(\d+)/)[1];
    // لـ sha256 المصرّح به في CSP، وإلا تمنعه السياسة ويظهر وميض النص السادة.
    const flagScript = indexHtml.match(/<script>(document\.documentElement[^<]*)<\/script>/);
    assert.ok(flagScript, "first-paint flag script missing from index.html");
    const { CSP_POLICY } = await import("../config/security-headers.mjs");
    const flagHash =
      "sha256-" + createHash("sha256").update(flagScript[1], "utf8").digest("base64");
    assert.ok(
      CSP_POLICY.includes(flagHash),
      `CSP script-src missing hash ${flagHash} for the first-paint flag script`,
    );
    // 🚨 كل سكربت inline قابل للتنفيذ في index.html يجب أن يكون hash مصرّحًا
    // في CSP. سكربت GA-ID كان inline بلا hash، فكان يحجب بصمت عند تفعيل
    // التحليلات (CSP violation). الآن المعرّف في <meta> ولا سكربت إضافي.
    const executableInline = [
      ...indexHtml.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g),
    ]
      .filter(([, attrs]) => !/application\/ld\+json|application\/json/.test(attrs))
      .map(([, , body]) => body)
      .filter((body) => body.trim().length > 0);
    const unhashed = executableInline
      .map((body) => "sha256-" + createHash("sha256").update(body, "utf8").digest("base64"))
      .filter((hash) => !CSP_POLICY.includes(hash));
    assert.deepEqual(
      unhashed,
      [],
      `inline scripts without CSP hash in index.html: ${unhashed.join(", ")}`,
    );
    assert.match(
      indexHtml,
      /html\.js \[data-prerender-content\],\s*html\.js \[data-prerender-nav\]\s*\{\s*display:\s*none/,
    );
    const prerenderSource = readFileSync(resolve(ROOT, "scripts/prerender-seo.mjs"), "utf-8");
    assert.ok(
      !prerenderSource.includes("data-prerender-skeleton"),
      "Do not restore the partial loading shell",
    );
    assert.ok(!prerenderSource.includes("const heroReal"), "Do not paint the homepage hero alone");
    assert.equal(
      gaVersion,
      cacheConfig.version,
      `index.html ga-loader.js?v=${gaVersion} != config/cache-version.json ${cacheConfig.version}`,
    );
    assert.match(gaLoader, /window\.gtag\("config", measurementId/);
    assert.match(gaLoader, /send_page_view:\s*false/);
    assert.match(gaLoader, /configureGA\(\);/);
    assert.match(gaLoader, /window\.addEventListener\("load", startOnce, \{ once: true \}\)/);
    assert.match(gaLoader, /setTimeout\(startOnce, 3000\)/);
    assert.doesNotMatch(gaLoader, /"G-(?!X+\b)[A-Z0-9]{8,12}"/);
  }

  assert.deepEqual(productsDb, products, "products-db.json is stale; run npm run build");
  // no two products share identical image bytes — mislabeled-asset guard born
  // from the sotara SERP-thumbnail investigation (fleet audit: 83/83 unique).
  const crypto = await import("node:crypto");
  const seenBytes = new Map();
  for (const product of products) {
    if (!product.image) continue;
    const file = resolve(ROOT, "public", String(product.image).replace(/^\/+/, ""));
    assert.ok(existsSync(file), `Product ${product.id} image file missing: ${product.image}`);
    const digest = crypto.createHash("md5").update(readFileSync(file)).digest("hex");
    assert.ok(
      !seenBytes.has(digest),
      `Products ${seenBytes.get(digest)} and ${product.id} share identical image bytes (${product.image})`,
    );
    seenBytes.set(digest, product.id);
  }
  console.log(`✓ fleet images: ${seenBytes.size} unique product image files, all present`);
  assert.deepEqual(
    Object.keys(PRODUCT_META_PROFILES).sort(),
    products.map((product) => product.id).sort(),
    "Every catalog product must have one reviewed Product Meta profile",
  );

  // product meta copy. The source benefit is not medically verified here; keep
  // the implementation tied to the product record and within the snippet cap.
  for (const product of products) {
    const profile = PRODUCT_META_PROFILES[product.id];
    const description = makeProductMetaDescription(product);
    assert.ok(profile, `Product Meta profile missing: ${product.slug}`);
    if (product.category === "devices") {
      assert.equal(profile.form, "device", `Device form drifted: ${product.slug}`);
    }
    if (profile.form === "topical") {
      assert.match(
        description,
        /كريم|جل|بخاخ|مناديل|موضعي|cream|gel|spray|wipes/i,
        `Topical form missing: ${product.slug}`,
      );
    }
    if (profile.form === "device") {
      assert.match(
        description,
        /جهاز|مضخة|طقم|حقيبة|pump|device/i,
        `Device form missing: ${product.slug}`,
      );
    }
    assert.ok(
      description.length <= 155,
      `Product meta description too long: ${product.slug} (${description.length})`,
    );
    // Explicit owner exception: Kreva uses its literal 17 August meta, not
    // the later first-benefit/shipping template. Keep an exact regression guard.
    // (Round 9) النص اتغيّر مع إزالة «الألماني المتطور/بعناية/التحكم الكامل»
    // من وصف المنتج (ادعاءات أصل وكليشيهات) — السعر والمخزون والغياب عن
    // التقييمات كما هي، والغرض من الحارس باقٍ: الميتا مش من القالب.
    if (product.id === "m-60") {
      assert.equal(
        description,
        "جل كريفا للرجال (Kreva Gel 50GM) هو تركيبة جل كريمي متخصصة ثنائية المفعول (ساخن وبارد) لدعم الأداء والتحكم في وقت العلاقة. يجمع زيت Cayenne Oil الذي ينشط…",
      );
      assert.equal(product.price, 280);
      assert.equal(product.stock, 5000);
      assert.equal(product.rating, undefined);
      assert.equal(product.reviews, undefined);
      continue;
    }
    const firstBenefit = String(product.benefits?.[0] ?? "")
      .trim()
      .replace(/\s+/g, " ");
    assert.ok(firstBenefit, `Product first benefit missing: ${product.slug}`);
    assert.ok(
      description.includes(firstBenefit.slice(0, Math.min(15, firstBenefit.length))),
      `Product meta description is missing its raw first-benefit excerpt: ${product.slug}`,
    );
    assert.match(
      description,
      /شحن سري ودفع عند الاستلام|غير متوفر حالياً/,
      `Product meta availability missing: ${product.slug}`,
    );
    assert.match(description, /شحن سري/, `Product meta shipping missing: ${product.slug}`);
    assert.match(description, /الإخلاص ميديكال/, `Product meta brand missing: ${product.slug}`);
    assert.match(
      description,
      /[.!؟]$/,
      `Product meta description must end as a sentence: ${product.slug}`,
    );
  }
  // config-db.json = artifact للسيرفر (مش مصدر): الشحن/العروض/نسبة الباقة
  // مولّد من مصادر TS وقت البناء (SSOT = TS).
  // لو حد عدّل الـ JSON يدويًا، هيفشل الـ test هنا حتى يعمل build.
  assert.deepEqual(
    configDb,
    {
      GOVERNORATE_SHIPPING: siteConfig.GOVERNORATE_SHIPPING,
      FREE_SHIPPING_THRESHOLD: siteConfig.FREE_SHIPPING_THRESHOLD,
      PROMO_TIERS: promo.PROMO_TIERS,
      BUNDLE_DISCOUNT_RATE: bundle.BUNDLE_DISCOUNT_RATE,
    },
    "config-db.json is stale; run npm run build",
  );
  assert.equal(products.length, 85, "Expected 85 products (54 men / 25 women / 6 devices)");
  assert.ok(articles.length >= 0, "Articles array must be valid");
  const cialisFour = products.find((p) => p.id === "m-64");
  assert.equal(cialisFour?.slug, "cialis-tadalafil-20mg-4-tabs");
  assert.equal(cialisFour.price, 430);
  assert.equal(siteConfig.isMerchantFeedExcluded(cialisFour), true);
  assert.ok(products.some((p) => p.id === "m-37" && p.slug === "cialis-tadalafil-20mg-30-tabs"));
  const overtime = products.find((p) => p.id === "m-08");
  assert.equal(overtime?.slug, "over-time-erection-delay-cards");
  assert.equal(overtime.price, 330);
  assert.equal(overtime.stock, 5000);
  assert.equal(siteConfig.isMerchantFeedExcluded(overtime), true);
  // 🔗 لكل منتج رابط واحد نهائي — لا مسارات بديلة ولا تحويلات لها.
  assert.deepEqual(
    vercel.redirects.filter((rule) => rule.source.startsWith("/products")),
    [],
    "لا يجوز وجود تحويل لأي مسار منتج",
  );

  // 🧭 Anti-drift: أرقام الكتالوج/المحتوى hardcoded في نصوص التسويق = درفت
  // حتمي مع أي تغيير في الكتالوج أو المقالات. الـ UI لازم يقرأ الـ counts
  // ديناميكياً (products.length / articles.length / seoLandingPages.length).
  for (const file of [
    "src/routes/about.tsx",
    "src/routes/medical-review-board.tsx",
    "src/data/landing-pages.ts",
    "src/routes/wishlist.tsx",
    "src/components/sections/ArticlesGrid.tsx",
    "src/routes/education.tsx",
  ]) {
    const content = readFileSync(resolve(ROOT, file), "utf-8");
    assert.doesNotMatch(
      content,
      /\b\d{1,3}\s*مقال(ة)?\b/,
      `${file} contains a hardcoded article count، use ARTICLE_COUNT/articles.length (drift risk)`,
    );
    assert.doesNotMatch(
      content,
      /\b\d{1,3}\s*دليل SEO/,
      `${file} contains a hardcoded SEO-guide count، use seoLandingPages.length (drift risk)`,
    );
    assert.doesNotMatch(
      content,
      /\bأكثر من \d{1,3}\s*منتج/,
      `${file} contains a hardcoded "more than N products" claim، use products.length (drift risk)`,
    );
  }
  assert.ok(Array.isArray(seoLandingPages), `Expected seoLandingPages to be an array`);
  assert.deepEqual(duplicates(products.map((p) => p.id)), [], "Duplicate product IDs");
  assert.deepEqual(duplicates(products.map((p) => p.slug)), [], "Duplicate product slugs");
  assert.deepEqual(duplicates(articles.map((a) => a.slug)), [], "Duplicate article slugs");
  for (const article of articles) {
    assert.ok(article.author?.name, `Missing article author: ${article.slug}`);
    assert.ok(article.reviewer?.name, `Missing article reviewer: ${article.slug}`);
    assert.match(
      article.publishedAt,
      /^\d{4}-\d{2}-\d{2}$/,
      `Invalid publishedAt: ${article.slug}`,
    );
    assert.match(article.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `Invalid updatedAt: ${article.slug}`);
    assert.ok(article.sources.length >= 2, `Article needs at least 2 sources: ${article.slug}`);
    for (const source of article.sources) {
      assert.match(source.url, /^https:\/\//, `Article source must be https: ${article.slug}`);
      assert.ok(source.title && source.publisher, `Incomplete source: ${article.slug}`);
    }
  }
  // ── Drift guard: بطاقات الـ homepage المولّدة (articles-cards.generated.ts) ──
  // لازم تطابق المصدر (articles.ts) حقاً — لو قديمة → البناء مولّد قبل تعديلك.
  assert.ok(
    existsSync(resolve(ROOT, "src/data/articles-cards.generated.ts")),
    "src/data/articles-cards.generated.ts missing; run npm run build",
  );
  const cards = await vite.ssrLoadModule("/src/data/articles-cards.generated.ts");
  assert.equal(
    cards.ARTICLE_COUNT,
    articles.length,
    "articles-cards.generated.ts ARTICLE_COUNT stale; run npm run build",
  );
  assert.ok(
    Array.isArray(cards.featuredArticleCards),
    "featuredArticleCards missing; run npm run build",
  );
  for (const card of cards.featuredArticleCards) {
    const src = articles.find((a) => a.slug === card.slug);
    assert.ok(src, `featured card ${card.slug} not found in articles.ts`);
    assert.equal(src.title, card.title, `featured card ${card.slug} title stale`);
    assert.equal(src.excerpt, card.excerpt, `featured card ${card.slug} excerpt stale`);
    assert.equal(src.category, card.category, `featured card ${card.slug} category stale`);
    assert.equal(src.readMin, card.readMin, `featured card ${card.slug} readMin stale`);
    assert.equal(src.emoji, card.emoji, `featured card ${card.slug} emoji stale`);
    assert.equal(src.image ?? undefined, card.image, `featured card ${card.slug} image stale`);
  }
  // ── Drift guard: meta + body المولّدين (فصل content عن القوائم) ──
  assert.ok(
    existsSync(resolve(ROOT, "src/data/articles-meta.generated.ts")),
    "src/data/articles-meta.generated.ts missing; run npm run build",
  );
  assert.ok(
    existsSync(resolve(ROOT, "src/data/article-content.generated.ts")),
    "src/data/article-content.generated.ts missing; run npm run build",
  );
  const meta = await vite.ssrLoadModule("/src/data/articles-meta.generated.ts");
  const body = await vite.ssrLoadModule("/src/data/article-content.generated.ts");
  assert.equal(
    meta.articlesMeta.length,
    articles.length,
    "articlesMeta count stale; run npm run build",
  );
  const metaBySlug = new Map(meta.articlesMeta.map((m) => [m.slug, m]));
  const bodyBySlug = new Map(Object.entries(body.articleBodies));
  for (const a of articles) {
    const m = metaBySlug.get(a.slug);
    const b = bodyBySlug.get(a.slug);
    assert.ok(m, `meta ${a.slug} missing in generated meta`);
    assert.ok(b, `body ${a.slug} missing in generated content`);
    for (const f of [
      "title",
      "excerpt",
      "category",
      "readMin",
      "emoji",
      "publishedAt",
      "updatedAt",
    ]) {
      assert.deepEqual(m[f], a[f], `meta ${a.slug}.${f} stale; run npm run build`);
    }
    assert.equal(m.image ?? undefined, a.image, `meta ${a.slug}.image stale`);
    assert.deepEqual(m.author, a.author, `meta ${a.slug}.author stale`);
    assert.deepEqual(m.reviewer, a.reviewer, `meta ${a.slug}.reviewer stale`);
    assert.equal(m.autoReviewed ?? undefined, a.autoReviewed, `meta ${a.slug}.autoReviewed stale`);
    assert.equal(b.content, a.content, `body ${a.slug}.content stale; run npm run build`);
    assert.deepEqual(b.sources, a.sources, `body ${a.slug}.sources stale; run npm run build`);
  }
  assert.equal(bodyBySlug.size, articles.length, "articleBodies has extra/unknown slugs");

  {
    const topicsMod = await vite.ssrLoadModule("/src/data/topics.ts");
    const { TOPICS, pillarPath } = topicsMod;
    assert.ok(Array.isArray(TOPICS), "TOPICS must be an array");
    const articleSlugs = new Set(articles.map((a) => a.slug));
    const guideSlugs = new Map(seoLandingPages.map((p) => [p.slug, p]));
    const productIds = new Set(products.map((p) => p.id));
    const seenArticle = new Set();
    const seenGuide = new Set();
    const seenProduct = new Set();
    for (const t of TOPICS) {
      if (t.pillarKind === "article") {
        assert.ok(
          articleSlugs.has(t.pillarSlug),
          `topic ${t.id}: pillar article "${t.pillarSlug}" not in articles.ts`,
        );
      } else {
        const g = guideSlugs.get(t.pillarSlug);
        assert.ok(g, `topic ${t.id}: pillar guide "${t.pillarSlug}" not in landing-pages`);
        assert.ok(!g.noindex, `topic ${t.id}: pillar guide "${t.pillarSlug}" is noindex`);
      }
      for (const s of t.articleSlugs) {
        assert.ok(articleSlugs.has(s), `topic ${t.id}: unknown article "${s}"`);
        assert.ok(!seenArticle.has(s), `article "${s}" assigned to two topics`);
        seenArticle.add(s);
      }
      for (const s of t.guideSlugs) {
        assert.ok(guideSlugs.has(s), `topic ${t.id}: unknown guide "${s}"`);
        assert.ok(!seenGuide.has(s), `guide "${s}" assigned to two topics`);
        seenGuide.add(s);
      }
      for (const id of t.productIds) {
        assert.ok(productIds.has(id), `topic ${t.id}: unknown product "${id}"`);
        assert.ok(!seenProduct.has(id), `product "${id}" assigned to two topics`);
        seenProduct.add(id);
      }
    }
    if (TOPICS.length > 0) {
      const unassignedArticles = articles.filter((article) => !seenArticle.has(article.slug));
      assert.equal(
        unassignedArticles.length,
        0,
        `articles missing topic assignment: ${unassignedArticles.map((article) => article.slug).join(", ")}`,
      );
      const unassignedProducts = products.filter((product) => !seenProduct.has(product.id));
      assert.equal(
        unassignedProducts.length,
        0,
        `products missing topic assignment: ${unassignedProducts.map((product) => product.id).join(", ")}`,
      );
    }

    const pillarPaths = TOPICS.map((t) => pillarPath(t));
    assert.equal(duplicates(pillarPaths).length, 0, "two topics share the same pillar path");
    console.log(
      `✓ topics: ${TOPICS.length} topics, ${seenArticle.size} articles + ${seenGuide.size} guides + ${seenProduct.size} products assigned`,
    );
  }

  // ── Drift guard: landing-pages-meta.generated.ts (خفيف للـ bundles) ──
  assert.ok(
    existsSync(resolve(ROOT, "src/data/landing-pages-meta.generated.ts")),
    "src/data/landing-pages-meta.generated.ts missing; run npm run build",
  );
  {
    const lpMeta = await vite.ssrLoadModule("/src/data/landing-pages-meta.generated.ts");
    assert.equal(
      lpMeta.SEO_LANDING_PAGE_COUNT,
      seoLandingPages.length,
      "SEO_LANDING_PAGE_COUNT stale; run npm run build",
    );
    assert.equal(
      lpMeta.landingPagesMeta.length,
      seoLandingPages.length,
      "landingPagesMeta count stale; run npm run build",
    );
    const lpBySlug = new Map(lpMeta.landingPagesMeta.map((m) => [m.slug, m]));
    for (const p of seoLandingPages) {
      const m = lpBySlug.get(p.slug);
      assert.ok(m, `landingPagesMeta ${p.slug} missing; run npm run build`);
      assert.equal(m.title, p.title, `landingPagesMeta ${p.slug}.title stale; run npm run build`);
      assert.equal(
        m.noindex ?? false,
        Boolean(p.noindex),
        `landingPagesMeta ${p.slug}.noindex stale`,
      );
    }
  }

  // تم إلغاء الفحص المعجمي لعبارات الادعاءات الطبية من CI بقرار المالك.
  // تبقى اختبارات بنية البيانات، الاتساق، schema، والأمان فعالة.

  assert.deepEqual(
    duplicates(seoLandingPages.map((page) => page.slug)),
    [],
    "Duplicate landing page slugs",
  );

  const categories = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(
    categories,
    { men: 54, women: 25, devices: 6 },
    "Unexpected category split (85 = 54 men / 25 women / 6 devices)",
  );

  {
    const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");
    const offerCatalog = indexHtml.match(/"name":\s*"منتجات الرجال",\s*"numberOfItems":\s*(\d+)/);
    const offerCatalogWomen = indexHtml.match(
      /"name":\s*"منتجات النساء",\s*"numberOfItems":\s*(\d+)/,
    );
    const offerCatalogDevices = indexHtml.match(
      /"name":\s*"الأجهزة الطبية",\s*"numberOfItems":\s*(\d+)/,
    );
    assert.ok(offerCatalog, "index.html JSON-LD missing men OfferCatalog");
    assert.ok(offerCatalogWomen, "index.html JSON-LD missing women OfferCatalog");
    assert.ok(offerCatalogDevices, "index.html JSON-LD missing devices OfferCatalog");
    assert.equal(
      Number(offerCatalog[1]),
      categories.men,
      `index.html JSON-LD men count ${offerCatalog[1]} != catalog ${categories.men}`,
    );
    assert.equal(
      Number(offerCatalogWomen[1]),
      categories.women,
      `index.html JSON-LD women count ${offerCatalogWomen[1]} != catalog ${categories.women}`,
    );
    assert.equal(
      Number(offerCatalogDevices[1]),
      categories.devices,
      `index.html JSON-LD devices count ${offerCatalogDevices[1]} != catalog ${categories.devices}`,
    );
    // مشاركين #organization — graph غير نظيف)
    const ids = [...indexHtml.matchAll(/"@id":\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(duplicates(ids), [], "Duplicate @id in index.html JSON-LD graph");
  }

  const { getArchivedReviewSummary, getProductReviews } = await vite.ssrLoadModule(
    "/src/lib/legacy-product-reviews.ts",
  );
  for (const product of products) {
    const archive = getArchivedReviewSummary(product.slug);
    if (archive) {
      assert.equal(product.rating, archive.rating, `Archive rating mismatch: ${product.slug}`);
      assert.equal(product.reviews, archive.reviewCount, `Archive count mismatch: ${product.slug}`);
    } else {
      assert.equal(product.rating, undefined, `Unbacked rating: ${product.slug}`);
      assert.equal(product.reviews, undefined, `Unbacked review count: ${product.slug}`);
      assert.deepEqual(getProductReviews(product.slug, product.category).reviews, []);
    }
  }

  // Historical ratings are restored only for the archived products approved
  // by the owner. New products must not receive invented defaults or counts.
  for (const product of products) {
    const hasRating = Object.hasOwn(product, "rating");
    const hasReviews = Object.hasOwn(product, "reviews");
    assert.equal(hasRating, hasReviews, `Incomplete legacy review summary in ${product.id}`);
    if (hasRating) {
      assert.ok(
        Number.isFinite(product.rating) && product.rating >= 1 && product.rating <= 5,
        `Invalid rating in ${product.id}`,
      );
      assert.ok(
        Number.isInteger(product.reviews) && product.reviews >= 1,
        `Invalid review count in ${product.id}`,
      );
    }
  }

  // Verify every product-bearing homepage section, not only the top featured grid.
  const featuredProducts = getFeaturedProducts();
  assert.equal(featuredProducts.length, 6, "Homepage must show exactly 6 featured products");
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  // المصدر المشترك نفسه الذي تستخدمه مكونات الهوم — يمنع انحراف نسخة الاختبار
  const concernCandidates = HOMEPAGE_CONCERN_CANDIDATES;
  const concernIds = Object.values(concernCandidates).flatMap((ids) =>
    ids.filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id)).slice(0, 3),
  );
  assert.equal(concernIds.length, 12, "Homepage concern sections must show 12 products");
  // (2026-11-19) التبويبات بقت اختيارًا محرَّرًا بالجودة والتنوّع (HOMEPAGE_TAB_PICKS)
  // لا «أرخص 4 متبقية» — والاختبار يقرأ نفس الدالة التي تقرأها الواجهة.
  const tabProductsPerCategory = HOMEPAGE_TAB_CATEGORIES.map(
    (category) => getHomepageTabCards(category).length,
  );
  const tabProducts = HOMEPAGE_TAB_CATEGORIES.flatMap((category) => getHomepageTabCards(category));
  assert.deepEqual(
    tabProductsPerCategory,
    [4, 4, 4],
    "Homepage category tabs must show exactly 4 products in every category",
  );
  assert.equal(
    tabProducts.length,
    new Set(tabProducts.map((product) => product.id)).size,
    "A product is repeated inside the homepage category tabs",
  );
  assert.deepEqual(
    tabProducts.filter((product) => HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id)).map((p) => p.id),
    [],
    "An excluded product is still shown in a category tab",
  );
  // التنوّع: لا بطاقتان من نفس عائلة الشكل داخل التبويب الواحد.
  for (const product of tabProducts) {
    const family = getProductFamily(product);
    const siblings = tabProducts.filter(
      (other) => other.category === product.category && getProductFamily(other) === family,
    );
    assert.equal(
      siblings.length,
      1,
      `Category tab is not diverse: ${product.category} repeats the "${family}" family`,
    );
  }
  // لا تكرار مع «الأكثر طلبًا» أو «حدّد احتياجك» — باستثناء جهاز واحد مسموح
  // لأن الكتالوج فيه 6 أجهزة فقط والرئيسية تعرض 3 منها في أقسام الاهتمام.
  const previouslyDisplayedIds = new Set([...featuredIds, ...concernIds]);
  const overlaps = tabProducts
    .filter((product) => previouslyDisplayedIds.has(product.id))
    .map((product) => product.id);
  assert.deepEqual(
    overlaps,
    ["d-07"],
    "Category tabs must not repeat products already shown on the homepage (only the single device is allowed)",
  );
  assert.deepEqual(
    tabProducts.filter((product) => HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id)).map((p) => p.id),
    [],
    "An excluded product is still present in a homepage section",
  );

  for (const product of products) {
    assert.match(product.slug, /^[a-z0-9-]+$/, `Invalid slug: ${product.id}`);
    assert.ok(product.price > 0, `Invalid price: ${product.id}`);
    assert.ok(product.stock >= 0, `Invalid stock: ${product.id}`);
    assert.ok(product.description.length >= 80, `Short description: ${product.id}`);
    assert.ok(product.benefits.length >= 3, `Too few benefits: ${product.id}`);

    const expectedPrefix =
      product.category === "men" ? "m-" : product.category === "women" ? "w-" : "d-";
    assert.ok(product.id.startsWith(expectedPrefix), `ID/category prefix mismatch: ${product.id}`);

    if (product.image) {
      const imagePath = resolve(ROOT, "public", product.image.replace(/^\//, "").split("?")[0]);
      const thumbPath = resolve(
        ROOT,
        "public/images/thumbs",
        product.image.split("/").pop().split("?")[0],
      );
      assert.ok(existsSync(imagePath), `Missing image: ${product.id} ${product.image}`);
      assert.ok(existsSync(thumbPath), `Missing thumbnail: ${product.id} ${product.image}`);

      // Images now use slug-based names, no prefix check needed
      assert.ok(
        product.image.split("/").pop().split("?")[0].endsWith(".webp"),
        `Image must be .webp: ${product.id} ${product.image}`,
      );
    }
  }

  const productIds = new Set(products.map((p) => p.id));

  // 🎁 خريطة الباقات (bundles-db.json) — مولّدة من نفس محرك cross-sell،
  // ويجب أن تشير كل أعضائها لمنتجات موجودة (تُتحقق منها الخادم عند خصم الباقة)
  const bundlesDb = JSON.parse(
    readFileSync(resolve(ROOT, "api", "lib", "bundles-db.json"), "utf-8"),
  );
  assert.ok(Object.keys(bundlesDb).length > 0, "bundles-db.json is empty");
  for (const [mainId, members] of Object.entries(bundlesDb)) {
    assert.ok(productIds.has(mainId), `Bundle main missing: ${mainId}`);
    assert.equal(members.length, 3, `Bundle must contain exactly 3 products: ${mainId}`);
    for (const member of members) {
      assert.ok(productIds.has(member), `Bundle member missing: ${member} (of ${mainId})`);
    }
    const forms = new Set(
      members
        .map((id) => getOralSolidForm(products.find((product) => product.id === id)))
        .filter(Boolean),
    );
    assert.ok(
      forms.size <= 1,
      `Bundle mixes tablets and capsules: ${mainId} (${members.join(", ")})`,
    );
    const presentations = new Set(
      members
        .map((id) => getBundlePresentation(products.find((product) => product.id === id)))
        .filter(Boolean),
    );
    assert.ok(
      presentations.size <= 1,
      `Bundle mixes gel and cream: ${mainId} (${members.join(", ")})`,
    );
    const productTypes = members.map((id) =>
      getBundleProductType(products.find((product) => product.id === id)),
    );
    assert.equal(
      new Set(productTypes).size,
      productTypes.length,
      `Bundle repeats a product type (${productTypes.join(", ")}): ${mainId} (${members.join(", ")})`,
    );
  }

  for (const page of seoLandingPages) {
    assert.match(page.slug, /^[a-z0-9-]+$/, `Invalid landing page slug: ${page.slug}`);
    assert.ok(page.title.length >= 8, `Landing page title too short: ${page.slug}`);
    assert.ok(
      page.metaDescription.length >= 50,
      `Landing meta description too short: ${page.slug}`,
    );
    assert.ok(page.sections.length >= 2, `Landing page needs at least 2 sections: ${page.slug}`);
    assert.ok(page.faqs.length >= 1, `Landing page needs at least 1 FAQ: ${page.slug}`);
    for (const id of page.productIds) {
      assert.ok(productIds.has(id), `Landing page ${page.slug} references missing product ${id}`);
    }
  }

  // طبيًا على صفحات الأدلة، وفق قرار المالك الحالي.

  assert.deepEqual(
    duplicates(vercel.redirects.map((r) => r.source)),
    [],
    "Duplicate redirect sources in vercel.json",
  );
  // 🔗 لكل منتج رابط واحد نهائي: لا مسار بالكود الداخلي ولا تحويل له.
  const redirectBySource = new Map(vercel.redirects.map((r) => [r.source, r]));
  assert.deepEqual(
    vercel.redirects.filter((r) => r.source.startsWith("/products")),
    [],
    "No product path may be redirected",
  );
  for (const product of products) {
    assert.equal(
      redirectBySource.has(`/products/${product.id}`),
      false,
      `Product ${product.id} must not have an ID-based alias`,
    );
  }
  assert.equal(
    redirectBySource.get("/index.html")?.destination,
    "/",
    "Missing /index.html redirect",
  );
  assert.equal(redirectBySource.get("/index")?.destination, "/", "Missing /index redirect");

  // ── سلامة شبكة الـ redirects: لا loops، لا chains، ولا destinations ميتة ──
  // (حماية تلقائية مع كل تغيير في الكتالوج — أي destination غير موجودة أو
  // أي destination هي source لقاعدة تانية = فشل فوري في CI)
  const isLiteralPath = (p) => !p.includes(":") && !p.includes("*") && !p.includes("(");
  const knownStaticRoutes = new Set([
    "/",
    "/products/men",
    "/products/women",
    "/products/devices",
    "/search",
    "/education",
    "/about",
    "/contact",
    "/medical-review-board",
    "/shipping",
    "/returns",
    "/terms",
    "/privacy",
    "/cart",
    "/order-confirmed",
    "/thank-you",
    "/wishlist",
  ]);
  const productSlugs = new Set(products.map((p) => p.slug));
  const articleSlugs = new Set(articles.map((a) => a.slug));
  const guideSlugs = new Set(seoLandingPages.map((g) => g.slug));
  const destinationIsLive = (dest) => {
    if (knownStaticRoutes.has(dest)) return true;
    const parts = dest.split("/").filter(Boolean);
    if (parts[0] === "products" && parts.length === 2) return productSlugs.has(parts[1]);
    if (parts[0] === "products" && parts[1] === "guides" && parts.length === 3) {
      return guideSlugs.has(parts[2]);
    }
    if (parts[0] === "education" && parts.length === 2) return articleSlugs.has(parts[1]);
    return false;
  };

  // 1) كل destination حرفية (غير باراميترية) يجب أن تفسر لـ route حقيقية
  for (const r of vercel.redirects) {
    if (!isLiteralPath(r.destination)) continue; // destinations الباراميترية تخص التطبيق
    assert.ok(
      destinationIsLive(r.destination),
      `Redirect ${r.source} -> ${r.destination} points to a route that does not exist`,
    );
  }

  // 2) لا سلاسل/حلقات: destination قاعدة لا يجوز أن تكون source لقاعدة تانية
  // (الحلقة حالة خاصة من السلسلة — لو A->B->A فالقيد ده يمسكها من أول خطوة)
  const literalGraph = new Map(
    vercel.redirects
      .filter((r) => isLiteralPath(r.source) && isLiteralPath(r.destination))
      .map((r) => [r.source, r.destination]),
  );
  for (const [source, destination] of literalGraph) {
    assert.ok(
      !literalGraph.has(destination),
      `Redirect chain/loop: ${source} -> ${destination} (destination must not be another rule's source)`,
    );
  }
  const sourceValidator = readFileSync(
    resolve(ROOT, "scripts/validate-article-sources.mjs"),
    "utf-8",
  );
  assert.match(
    sourceValidator,
    /No generated article marker found[\s\S]*process\.exit\(2\)/,
    "Article source validation must fail instead of silently passing without a generated slug",
  );
  const serverSource = readFileSync(resolve(ROOT, "server/index.js"), "utf-8");
  assert.match(
    serverSource,
    /app\.get\("\/health"[\s\S]*?Cache-Control.*?no-store[\s\S]*?X-Robots-Tag/,
    "Self-hosted health endpoint must be non-cacheable and non-indexable",
  );

  const appsScript = readFileSync(resolve(ROOT, "google-apps-script.gs"), "utf-8");
  assert.match(
    appsScript,
    /createTextFinder\(orderId\)/,
    "Durable order idempotency search missing",
  );
  assert.doesNotMatch(
    appsScript,
    /lastRow\s*-\s*49/,
    "Order idempotency must not be limited to the last 50 rows",
  );
  assert.match(
    appsScript,
    /isInternational\s*=\s*\/\^\\\+\[1-9\]/,
    "Apps Script must accept canonical international phone numbers",
  );
  assert.doesNotMatch(appsScript, /Invalid Egyptian phone/, "Stale Egypt-only validation");
  assert.match(
    appsScript,
    /if \(statusCol <= 0\) return "لا"/,
    "Verified reviews must fail closed when the order-status column is missing",
  );
  assert.match(
    appsScript,
    /currentHeaders\.indexOf\(expectedHeaders\[i\]\) === -1/,
    "Apps Script must repair missing headers even when the sheet column count matches",
  );
  assert.match(
    appsScript,
    /function readSheetHeaders\(sheet, columnCount\)/,
    "Apps Script should use one header-normalization helper",
  );
  assert.match(
    appsScript,
    /const HIDDEN_ORDER_HEADERS = new Set\(\["قيمة الخصم", "خصم الباقة"\]\)/,
    "Discount columns hidden from the Sheet must remain addressable by their headers",
  );
  assert.match(
    appsScript,
    /function hideOrderDiscountColumns\(\)[\s\S]*?hideDiscountColumnsOnSheet\(sheet\)/,
    "Discount columns should be hidden through an explicit, repeatable migration",
  );

  const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
  const imageSitemap = readFileSync(resolve(ROOT, "public/sitemap-images.xml"), "utf-8");
  const sitemapIndex = readFileSync(resolve(ROOT, "public/sitemap-index.xml"), "utf-8");
  const catalogFeed = readFileSync(resolve(ROOT, "public/catalog-feed.xml"), "utf-8");
  const inStockProducts = products.filter((product) => (product.stock ?? 0) > 0);
  const feedProducts = inStockProducts.filter((product) => !isMerchantFeedExcluded(product));
  assert.equal(
    (imageSitemap.match(/<image:loc>/g) || []).length,
    (imageSitemap.match(/<image:image>/g) || []).length,
    "Each image sitemap entry must contain exactly one image location",
  );
  assert.equal(
    (catalogFeed.match(/<item>/g) || []).length,
    feedProducts.length,
    "Catalog feed must contain every in-stock, feed-eligible catalog product",
  );
  assert.equal(
    (catalogFeed.match(/<g:google_product_category>/g) || []).length,
    feedProducts.length,
    "Every catalog feed item must have an official Google product category",
  );
  assert.equal(
    (catalogFeed.match(/<g:product_type>/g) || []).length,
    feedProducts.length,
    "Every catalog feed item must declare a store product_type for Merchant Center",
  );
  assert.equal(
    (catalogFeed.match(/<g:identifier_exists>/g) || []).length,
    feedProducts.length,
    "Every catalog feed item must declare identifier_exists",
  );
  assert.equal(
    (catalogFeed.match(/<g:identifier_exists>no<\/g:identifier_exists>/g) || []).length,
    feedProducts.filter((product) => !product.gtin && !product.mpn).length,
    "identifier_exists=no must match products without verified GTIN/MPN",
  );
  assert.equal(
    (catalogFeed.match(/<g:brand>/g) || []).length,
    feedProducts.filter((product) => Boolean(product.brand?.trim())).length,
    "Merchant feed must not invent a brand from the product name",
  );
  assert.doesNotMatch(
    catalogFeed,
    /طريقة الاستخدام/,
    "Merchant feed descriptions must not include usage instructions",
  );
  assert.equal(
    sitemapIndex.includes("catalog-feed.xml"),
    false,
    "Product feed must not be listed as a sitemap",
  );
  const siteOrigin = (process.env.SITE_URL || "https://alikhlasmedical.store").replace(/\/$/, "");
  for (const product of products) {
    const productUrl = `${siteOrigin}/products/${product.slug}`;
    assert.equal(sitemap.includes(productUrl), true, `Product missing from sitemap: ${product.id}`);
    assert.equal(
      imageSitemap.includes(productUrl),
      true,
      `Product missing from image sitemap: ${product.id}`,
    );
    if ((product.stock ?? 0) > 0 && !isMerchantFeedExcluded(product)) {
      assert.equal(
        catalogFeed.includes(`<g:id>${product.id}</g:id>`),
        true,
        `Product missing from catalog feed: ${product.id}`,
      );
      assert.equal(
        catalogFeed.includes(`<g:link>${productUrl}</g:link>`),
        true,
        `Product URL missing from catalog feed: ${product.id}`,
      );
    }
  }
  for (const restoredSlug of [
    "hard-on-190-sildenafil-dapoxetine",
    "cialis-tadalafil-20mg-30-tabs",
    "power-36-golden-tablets",
    "viagra-pfizer-100mg-original",
    "viagra-women-20-tablets",
  ]) {
    assert.equal(
      vercel.headers.some((entry) => entry.source.includes(restoredSlug)),
      false,
      `Product must not have noindex header rules: ${restoredSlug}`,
    );
  }

  for (const blockedPath of ["/cart", "/thank-you", "/order-confirmed"]) {
    assert.equal(sitemap.includes(`<loc>${siteOrigin}${blockedPath}</loc>`), false);
  }
  for (const product of products) {
    assert.equal(
      sitemap.includes(`<loc>${siteOrigin}/products/${product.id}</loc>`),
      false,
      `Sitemap contains legacy product ID URL: ${product.id}`,
    );
  }
  for (const page of seoLandingPages) {
    if (page.noindex) continue;
    assert.ok(
      sitemap.includes(`<loc>${siteOrigin}/products/guides/${page.slug}</loc>`),
      `Sitemap missing landing page: ${page.slug}`,
    );
  }

  // 🧭 قرار موثق: sitemap "نظيف لجوجل" — بدون أي search template.
  // امتداد Yandex <search> بيعلّمه Google Search Console كـ "علامة XML غير
  // صالحة" (error دائم في تقرير الـ sitemap). بحث جوجل الشامل شغال عبر
  // SearchAction في JSON-LD الصفحة الرئيسية — مش عبر sitemap.
  assert.ok(
    !sitemap.includes("xmlns:search"),
    "Sitemap must NOT declare the Yandex search namespace (GSC reports it as an invalid tag)",
  );
  assert.ok(
    !sitemap.includes("<search>"),
    "Sitemap must NOT contain a <search> extension element (GSC reports it as an invalid tag)",
  );
  assert.ok(
    !sitemap.includes("{search_term_string}"),
    "Sitemap must NOT contain search template placeholder URLs",
  );

  assert.equal(promo.calcDiscount(999, new Date("2026-06-01T12:00:00Z")), 0);
  assert.equal(promo.calcDiscount(1000, new Date("2026-06-01T12:00:00Z")), 100);
  assert.equal(promo.calcDiscount(1500, new Date("2026-06-01T12:00:00Z")), 225);
  assert.equal(promo.calcDiscount(2000, new Date("2026-06-01T12:00:00Z")), 400);
  assert.equal(promo.isPromotionEnabled(new Date("2026-06-26T00:00:00Z")), true);
  assert.equal(promo.isPromotionEnabled(new Date("2027-01-02T00:00:00Z")), true);

  // Editorial relevance: never pad a list to six unrelated products.
  const { getProductsForArticle } = await vite.ssrLoadModule("/src/lib/internal-links.ts");
  assert.deepEqual(
    getProductsForArticle("omega-3-omega-6-benefits-skin-cell-elasticity"),
    [],
    "No omega supplement is stocked: do not recommend unrelated women's products",
  );
  assert.deepEqual(getProductsForArticle("peruvian-maca-root-energy-vitality-men-women"), ["m-02"]);
  assert.deepEqual(getProductsForArticle("red-korean-ginseng-energy-endurance-benefits"), [
    "m-04",
    "m-02",
  ]);
  const womenProductIds = getProductsForArticle("women-products-complete-guide");
  assert.ok(womenProductIds.length > 0, "The women's product guide must retain relevant products");
  for (const id of womenProductIds)
    assert.equal(products.find((p) => p.id === id)?.category, "women");
  for (const article of articles) {
    const ids = getProductsForArticle(article.slug);
    assert.deepEqual(duplicates(ids), [], `Duplicate recommendations in ${article.slug}`);
    for (const id of ids)
      assert.ok(
        products.some((p) => p.id === id),
        `Unknown recommendation ${id}`,
      );
  }

  // ── vercel.json route sources must compile with the SAME engine Vercel
  // validates them with (path-to-regexp v6). A pattern this engine rejects
  // fails the Vercel deploy BEFORE the build even starts — two deploys were
  // every source in headers/redirects/rewrites is compiled here first.
  const { pathToRegexp } = await import("path-to-regexp");
  const vercelCfg = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
  const routeSources = [
    ...(vercelCfg.headers ?? []).map((h) => h.source),
    ...(vercelCfg.redirects ?? []).map((r) => r.source),
    ...(vercelCfg.rewrites ?? []).map((r) => r.source),
  ];
  for (const src of routeSources) {
    assert.doesNotThrow(
      () => pathToRegexp(src),
      `vercel.json source rejected by path-to-regexp v6 (Vercel would refuse the deploy): ${src}`,
    );
  }
  console.log(`✓ vercel.json: ${routeSources.length} route sources compile with path-to-regexp v6`);

  console.log("✓ data integrity tests passed");
} finally {
  await vite.close();
}
