# Google Tag Manager وGA4 على الموقع

> ## الحالة الحالية (2026-11-23): GA4 مباشرة، وGTM موقوف مؤقتًا
>
> | القناة | الحالة | المعرّف |
> | --- | --- | --- |
> | GA4 مباشرة (`gtag.js`) | **مفعّلة** | `G-FTZG9H6DJX` |
> | GTM (`gtm.js`) | موقوفة (سطر واحد لإعادة تشغيلها) | `GTM-M4M8HHJT` |
>
> **ليه مش الاتنين مع بعض؟** كلاهما يستهلك نفس `dataLayer`. عند تشغيل
> الاثنين تظهر رسالة جوجل نفسها التي ظهرت في لوحة GA: «متصل بأكثر من حاوية
> وقد تختلف البيانات». عمليًا الأحداث تذهب لطابور GTM ولا تجد وسمًا يرسلها،
> فتصل الصفحات بلا تحويلات. لذلك نستخدم **مسارًا واحدًا واضحًا**.
>
> **لتفعيل GTM لاحقًا** (لو أضفت Google Ads أو بيكسل آخر): ضع المعرّف في
> `.env.production` (`VITE_GTM_ID=GTM-M4M8HHJT`) وأفرغ `VITE_GA_ID`، ثم
> أنشئ داخل GTM وسم **GA4 Event** عام (Event Name = متغيّر `{{Event}}`،
> والمشغّل Custom Event)، وانشر الحاوية. لا تشغّل المسارين معًا.

---

## فين المعرّف؟

في مكان واحد فقط: `.env.production`

```
VITE_GTM_ID=GTM-M4M8HHJT
```

- `src/lib/site-config.ts` يقرأه ويصدّره كـ`GTM_CONTAINER_ID` **بعد التحقق**
  من صيغة `GTM-XXXXXXX`. أي قيمة غير صالحة أو فاضية = الوسم لا يُحمَّل إطلاقًا.
- `index.html` لا يحمل المعرّف حرفيًا، بل الرمز `__GTM_ID__` داخل كتلتين
  محصورتين بين `<!-- gtm:start -->` و`<!-- gtm:end -->`.
- `scripts/prerender-seo.mjs` يستبدل الرمز في كل صفحة مبنية (138 صفحة). ولو
  كان المعرّف فارغًا يحذف الكتلتين بالكامل، فلا طلب شبكة لجوجل ولا iframe ناقص.

**لتغيير الحاوية:** عدّل السطر في `.env.production` واعمل Deploy. لا تعدّل
`index.html` أبدًا.

## إزاي بتحمّل؟

`public/gtm-init.js` ملف على نطاقنا فيه نفس منطق سنيبت جوجل:

1. يقرأ المعرّف من `data-gtm-id` على وسم السكربت نفسه.
2. يتحقق من الصيغة، ولو غير صالحة يتوقف بلا أي طلب شبكة.
3. يهيّئ `dataLayer` ويدفع `gtm.start` و`gtm.js`.
4. يحقن `https://www.googletagmanager.com/gtm.js?id=...` بشكل `async`.
5. يضع `window.__IKHLAS_GTM__` ليستخدمه كود التحليلات.

السبب إننا لم نلصق السنيبت المضمَّن: سياسة CSP عندنا تسمح بـ`script-src 'self'`
بالإضافة لمضيفات جوجل، والسكربت المضمَّن يحتاج hash جديد في السياسة مع كل
تعديل. الملف المحلي يمرّ من `'self'` بلا أي استثناء جديد.

## الأحداث الجاهزة لمشغّلات GTM

`src/lib/analytics.ts` يدفع هذه الأحداث إلى `dataLayer` ككائنات عادية
(`{ event: "...", ...params }`)، وهي الصيغة التي تفهمها مشغّلات
**Custom Event** في GTM. عندما تكون الحاوية مفعّلة، الكود يفضّل هذه الصيغة
تلقائيًا بدل صيغة أوامر `gtag` (التي لا تطلق مشغّلات GTM).

| الحدث | متى يُطلق | المعاملات المهمة |
| --- | --- | --- |
| `page_view` | كل تنقّل داخل الموقع | `page_location`, `page_title` |
| `view_item` | صفحة منتج | `items[]`, `value`, `currency` |
| `view_item_list` | عرض قائمة/بحث/دليل | `item_list_name`, `items[]` |
| `select_item` | ضغط منتج من قائمة | `item_list_name`, `items[]` |
| `add_to_cart` | إضافة للسلة | `items[]`, `value` |
| `remove_from_cart` | حذف من السلة | `items[]`, `value` |
| `view_cart` | فتح السلة | `items[]`, `value` |
| `add_to_wishlist` / `remove_from_wishlist` | المفضلة | `items[]` |
| `begin_checkout` | بدء الطلب | `items[]`, `value`, `shipping` |
| `purchase` | الطلب اتسجّل فعلًا (شيت/واتساب) | `transaction_id`, `value`, `items[]` |
| `order_failed` | فشل تسجيل الطلب | `transaction_id`, `method` |
| `whatsapp_click` | ضغط أي زر واتساب | `link_url`, `context` |
| `cta_click` | أي زر رئيسي | `cta_name`, `location` |
| `share_click` | مشاركة منتج/مقال | `kind`, `ref_path` |
| `search` | بحث الموقع | `search_term`, `results_count` |
| `scroll_milestone` | قراءة 50% أو 90% | `percent`, `page_title` |
| `web_vital` | قياس أداء | `metric_name`, `value` |

## الأحداث تصل إلى GA4 إزاي (المسار المفعّل الآن)

`src/lib/analytics.ts` يدفع كل حدث بصيغة أوامر `gtag`:

```js
gtag("event", "view_item", { currency: "EGP", value: 280, items: [ … ] });
```

وهي الصيغة الوحيدة التي يفهمها `gtag.js` ويُرسلها فعلًا. الكود يضمن وجود
دالة `gtag` (نفس shim السنيبت القياسي) قبل أي حدث، فلا يضيع حدث لو نادى
التطبيق التحليلات قبل تحميل `gtag.js`.

للتأكد من أن الموقع يرسل: افتح الموقع، ثم في الكونسول:

```js
document.cookie.includes("_ga=")                 // true ⇒ GA استقبل الجلسة
window.dataLayer.filter((e) => e && e[1])         // أوامر gtag التي أرسلها الموقع
```

## إعداد جوجل أناليتكس 4 داخل GTM (لو رجعت لـGTM لاحقًا)

1. **Tags → New → GA4 Configuration** واختار حاوية GA4 بتاعتك.
2. في إعدادات الوسم: اقفل خيار **Send a page view event when this
   configuration loads** (المهم جدًا)، لأن الموقع يدفع `page_view` بنفسه.
   لو سِبت الخيار مفتوح، كل زيارة تُحسب مرتين.
3. **Trigger** للوسم: `page_view` (Custom Event).
4. وسوم إضافية للتحويلات: `add_to_cart` و`begin_checkout` و`purchase`
   (هذا الأخير هو المهم لحملات Google Ads).
5. لتحويل واتساب: Trigger على `whatsapp_click` أو `purchase` (method = whatsapp).

## قيود CSP مهمة

- وسوم **Custom HTML** لن تعمل لأن السياسة تمنع السكربتات المضمَّنة. استخدم
  قوالب جوجل الجاهزة (GA4، Google Ads، Conversion Linker) فهي تعمل عادي.
- المضيفات المصرّح بها: `www.googletagmanager.com` و`*.googletagmanager.com`
  في `script-src`/`connect-src`/`img-src`، و`frame-src` للـiframe الاحتياطي.
  أي مضيف جديد لازم يُضاف في `config/security-headers.mjs` و`vercel.json`
  معًا (فيه اختبار يضمن تطابقهما).

## الاختبار

1. GTM → **Preview** وادخل رابط الموقع: المفروض تشوف `Container Loaded`
   و`page_view` و`view_item` و`add_to_cart` على صفحة منتج.
2. من الكونسول: `window.__IKHLAS_GTM__` يرجع `GTM-X...`،
   و`window.dataLayer.map(e => e.event)` فيه الأحداث.
3. لو المعرّف مش ظاهر في الصفحة: تأكد إن `.env.production` فيه السطر، وإن
   `VITE_GTM_ID` في Vercel (لو مضاف) نوعه **Config** لا Secret.

## ملاحظة عن Vercel

المعرّف عام بطبيعته (يظهر في مصدر الصفحة)، فلا تحتاجه في لوحة Vercel. لو
أضفته هناك، اختار النوع **Config**، ولازم يطابق قيمته في `.env.production`
وإلا اختلفت الصفحات المبنية عن الباقي (نفس درس رقم الواتساب).
