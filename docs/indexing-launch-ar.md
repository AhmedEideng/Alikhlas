# خطة بدء الأرشفة (Indexing) — الإخلاص ميديكال

آخر تحديث: 2026-11-23. النطاق `alikhlasmedical.store` بقى شغال فعليًا،
ودي الحالة المقيسة بعد ربط الدومين، وبعدها الخطوات بالترتيب.

---

## الحالة المقيسة الآن (فحص حقيقي على الموقع المنشور)

| البند | النتيجة |
| --- | --- |
| `https://alikhlasmedical.store/` | 200 |
| `https://www.alikhlasmedical.store/` | 308 → النطاق الأساسي (مرة واحدة، بلا حلقة) |
| `robots.txt` | 200، يسمح للزحف ويعلن الثلاث خرائط |
| `sitemap.xml` | 200، 134 رابطًا (85 منتجًا + 8 مقالات + 23 صفحة هبوط + 18 صفحة ثابتة) |
| `sitemap-index.xml` / `sitemap-images.xml` | 200 |
| `feed.xml` (Merchant) | 200، 31 عنصرًا |
| `security.txt` | 200 |
| صفحة منتج | 200، `<link rel="canonical">` ذاتي + `index,follow,max-image-preview:large` |
| صفحة غير موجودة | 404 حقيقي (لا صفحة شبح) |
| ملف IndexNow | 200 ومحتواه مطابق للمفتاح |

**قبل أي شيء:** نشر Vercel الأخير كان فيه رقم واتساب بديل (`201000000000`)
لأن `VITE_WHATSAPP_NUMBER` في اللوحة كان بقيمة فاضية. اتصلح في الكود بقيمة
احتياطية + حارس يفشل البناء، فلازم **Redeploy** (هيحدث تلقائيًا مع أول push)
وبعدها يظهر الرقم الصحيح `201146044715` في كل الصفحات.

---

## ١) Google Search Console — الخاصية (Domain property)

الطريقة الأقوى والأسرع للنطاق الجديد:

1. افتح <https://search.google.com/search-console> → **Add property**.
2. اختار **Domain** (مش URL prefix) واكتب `alikhlasmedical.store`.
3. جوجل هيعطيك سجل **TXT** بالشكل:
   `google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. حطه في DNS:
   - لو النطاق على **Vercel DNS**: Vercel → Project → Settings → Domains →
     عند النطاق → **DNS Records** → أضف `TXT` بالاسم `@` وبالقيمة اللي نسختها.
   - لو على مزوّد تاني (GoDaddy/Namecheap…): نفس السجل TXT على الجذر `@`.
5. ارجع لجوجل واضغط **Verify**. عادة بيمشي في دقائق، وأحيانًا لحد ساعة
   لانتشار الـDNS.

> البديل لو مش قادر تعدّل DNS: اختار **URL prefix**
> `https://alikhlasmedical.store/` ثم اختار **HTML tag** وابعتلي السطر اللي
> فيه `<meta name="google-site-verification" content="...">` وأنا أضيفه في
> رأس الموقع وأنشره. (أو HTML file وأضيفه في `public/`.)

## ٢) إرسال الخرائط (بعد التوثيق)

في Search Console → **Sitemaps**:

1. أضف `sitemap-index.xml` (بيشمل sitemap.xml وsitemap-images.xml).
2. أضف كمان `feed.xml` تحت **Feeds** (لو حبيت تتابع الـMerchant feed).

البديل: `sitemap.xml` مباشرة. مش محتاج تضيف الأربعة، `sitemap-index.xml` كافية.

## ٣) أسرع طريق للظهور: فحص 10 روابط يدويًا

Search Console → **URL Inspection** → الصق الرابط → **Request indexing**.
الحد اليومي ~10 روابط، فابدأ بالأهم:

```
https://alikhlasmedical.store/
https://alikhlasmedical.store/products/men
https://alikhlasmedical.store/products/women
https://alikhlasmedical.store/products/devices
https://alikhlasmedical.store/products/kreva-advanced-men-gel-50g
https://alikhlasmedical.store/products/hammer-of-thor-men-capsules
https://alikhlasmedical.store/products/vitamax-doubleshot-energy-honey
https://alikhlasmedical.store/products/sotara-men-gel-50g
https://alikhlasmedical.store/education/premature-ejaculation
https://alikhlasmedical.store/products/guides
```

اليوم اللي بعده: صفحات المنتجات الأعلى سعرًا والأجهزة (`d-07`, `d-01`, `d-08`)
وصفحات الهبوط الثلاث الرئيسية (`delay-product-forms-guide`،
`vacuum-pump-buying-guide`، `honey-chocolate-label-guide`).

## ٤) Bing وYandex

- **Yandex** قبل الإرسال فعلًا (`202 success`) عبر `npm run indexnow`.
- **Bing** بيرفض للأسباب دي: `403 UserForbiddedToAccessSite`، ومعناها إن
  الموقع مش مضاف/موثّق في **Bing Webmaster Tools** (المفتاح وملف التحقق سليمان
  ومتاحان للبوت — أُكِّد بفحص بـuser-agent بتاع bingbot).
  الخطوات: <https://www.bing.com/webmasters> → Add site → **Import from Google
  Search Console** (أسرع) → بعدها `npm run indexnow` هيمشي.

## ٥) بعد الأرشفة (أسبوعيًا)

- Search Console → **Pages**: راقب «Discovered – currently not indexed»؛
  لو كترت، المشكلة في المحتوى/الروابط الداخلية مش في التقنية.
- **Performance**: أول ظهور عادة من 3 أيام إلى أسبوعين للنطاق الجديد،
  والفهرسة الكاملة لـ134 صفحة ممكن تاخد من أسبوعين لـ6 أسابيع.
- لو ظهرت «Duplicate, Google chose different canonical»: تأكد إن كل الروابط
  الداخلية على النطاق الأساسي بلا `www` (القاعدة موجودة ومحروسة باختبار).

## ٦) Merchant Center (اختياري لكن مفيد للمنتجات)

`feed.xml` جاهز. في Merchant Center → Products → Feeds → أضف
`https://alikhlasmedical.store/feed.xml` واختار جدولة يومية.
لاحظ إن المنتجات الدوائية (سيلدينافيل/تادالافيل/دابوكستين) مستبعدة من الفيد
تلقائيًا بسياسة المشروع، وصفحاتها تبقى مفهرسة عادي في جوجل.

---

## أوامر جاهزة

```bash
npm run indexnow          # إبلاغ Bing/Yandex بكل روابط الخريطة
npm run seo:audit:strict  # فحص SEO على كل الصفحات المبنية
npm run health-check      # فحص الصحة بعد النشر
curl -I https://alikhlasmedical.store/         # 200
curl -I https://www.alikhlasmedical.store/     # 308 إلى النطاق الأساسي
```
