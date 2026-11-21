# الدومين على Vercel ومتغيّر رقم واتساب

دليل قصير لأشهر مشكلتين بعد ربط الدومين: حلقة تحويل لا تنتهي
(`ERR_TOO_MANY_REDIRECTS`)، ورسالة Vercel عند محاولة إضافة `VITE_WHATSAPP_NUMBER`.

---

## ١) `ERR_TOO_MANY_REDIRECTS` على النطاق الجديد

### السبب (مثبت بالفحص)

الموقع بيحصل فيه تحويلين في اتجاهين متعاكسين:

| الطرف | مين اللي عمل التحويل | النتيجة |
| --- | --- | --- |
| `alikhlasmedical.store` → `www.alikhlasmedical.store` | إعداد الدومين في لوحة Vercel (الدومين الأساسي متسجّل `www`) | 308 |
| `www.alikhlasmedical.store` → `alikhlasmedical.store` | `vercel.json` (قاعدة `has: host`) | 308 |

كل طرف بيبعتك للتاني، فالمتصفح يقف بعد 20 محاولة ويطلع الشاشة الحمراء.
الفحص وقت المشكلة أعطى حرفيًا:

```
GET https://alikhlasmedical.store      → 308  location: https://www.alikhlasmedical.store/
GET https://www.alikhlasmedical.store  → 308  location: https://alikhlasmedical.store/
```

### الحل: اتجاه واحد فقط (www → النطاق الأساسي)

في لوحة Vercel: **Project → Settings → Domains**

1. عند `alikhlasmedical.store` اضغط **Edit** وتأكد إنه **متصل بدون تحويل**
   وأنه الدومين الأساسي (Production). لو فيه خيار «Redirect to www» امسحه.
2. عند `www.alikhlasmedical.store` اضغط **Edit** واختار
   **Redirect to `alikhlasmedical.store`** (308).
3. استنى نصف دقيقة، ثم افتح الموقع من الشبكة الخلوية (مش واي فاي) أو امسح
   كاش المتصفح، لأن تحويلات 308 بتتخزّن عند المتصفح.

> البديل المقبول: تسيب `www` **متصل بدون تحويل** وتسيب `vercel.json` يعمل
> التحويل لوحده. المهم إن اللوحة ما تحوّلش النطاق الأساسي إلى `www` أبدًا.

### التأكد من الإصلاح

```bash
curl -I https://alikhlasmedical.store/        # المتوقع: 200 (مش 308)
curl -I https://www.alikhlasmedical.store/    # المتوقع: 308 مرة واحدة إلى النطاق الأساسي
```

اختبار `src/__tests__/canonical-host.test.ts` بيفشل لو رجعت قاعدة في
`vercel.json` بتحوّل النطاق الأساسي إلى `www`، فالتكرار ده مش هيرجع بالخطأ.

---

## ٢) Vercel بيرفض يحفظ `VITE_WHATSAPP_NUMBER` كـ Secret

رسالة Vercel:

> Remove the public framework prefix to keep this value private. Public prefixes
> expose values to the browser.

### السبب

أي متغيّر يبدأ بـ `VITE_` بيتحول **وقت البناء** إلى نص داخل ملفات الجافاسكربت
اللي نازلة للمتصفح. يعني قيمته عامة بطبيعتها، وVercel بيمنعك تحفظها كـ **Secret**
لأن كلمة «سر» هنا مضللة، ومش عيب في الإعداد بتاعك.

### الحل: مش محتاج تضيفها من الأساس

رقم واتساب موجود بالفعل داخل الريبو في `.env.production`:

```
VITE_WHATSAPP_NUMBER=201146044715
```

والـDeploy بيقرأه من الريبو، فكل النشرات الحالية فيها الرقم الصح بلا أي متغيّر
في Vercel. الـ API السيرفري و`site-config` بياخدوا نفس القيمة، فمفيش تعارض.

لو **لازم** تضيفها في Vercel (مثلًا عشان تغيّر الرقم من غير Deploy من الريبو):

1. اختار النوع **Config** بدل **Secret** (Vercel هيسمح بالحفظ).
2. حط نفس الرقم الموجود في `.env.production` بالحرف، من غير `+` أو مسافات
   أو شرطات: `201146044715`.
3. بعد الحفظ اعمل **Redeploy** لأن `VITE_` بتتحقن وقت البناء لا وقت التشغيل.

### تحذير مهم

القيمة اللي في Vercel بتغلب قيمة الريبو وقت البناء، فلو حطيت رقم جديد في Vercel
من غير ما تحدّث `.env.production`، الاختبارات والـCI هيشوفوا الرقم القديم،
والصفحات المبنية مسبقًا (prerender) ممكن تختلف عن باقي الموقع. الأفضل والأسلم:
حدّث الرقم في الريبو مرة واحدة (مصدر واحد) واعمل Deploy عادي.

---

## جدول سريع: أي متغيّر يتسجّل Secret وأي واحد Config

| المتغيّر | النوع في Vercel | لماذا |
| --- | --- | --- |
| `VITE_WHATSAPP_NUMBER` | **Config** (أو لا تضيفه) | بيتحول لنص في المتصفح، مش سر |
| `VITE_GA_ID` | **Config** | نفس السبب |
| `GOOGLE_SHEETS_WEBHOOK_URL` | **Config** | رابط داخلي للـAPI، مش سر |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | **Secret** | يفتح كتابة الطلبات في الشيت |
| `GOOGLE_SHEETS_REVIEWS_TOKEN` | **Secret** | يفتح قراءة المراجعات |
| `SITE_URL` (اختياري) | **Config** | أصل الموقع للتحقق من CORS |

أسرار الشيت نفسها (`WEBHOOK_SECRET` و`REVIEW_READ_TOKEN`) مكانها الأساسي
**Script Properties** داخل Apps Script، والتفاصيل الكاملة في
`docs/sheets-setup-ar.md`.
