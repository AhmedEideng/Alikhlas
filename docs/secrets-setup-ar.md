# كل الأسرار والأشياء اللي لازم تتضاف في Vercel وGitHub

آخر تحديث: 2026-11-16 — مبني على كود المشروع نفسه (`api/`, `server/`, `scripts/`, `.github/workflows/`, `.env.example`).

القاعدة الحاكمة في المشروع:

- أي متغير بيبدأ بـ **`VITE_`** بيتحط **جوّه الـ JavaScript اللي بيوصلك للمتصفح** — يعني **مش سر خالص**. متحطش فيه أي مفتاح أو توكن.
- أي متغير **من غير** `VITE_` بيفضل على السيرفر (Serverless Functions) وده اللي بيتحسب سر فعلي.
- متغيرات البناء (`VITE_*`) **مش بتتغير غير بعمل Redeploy** — تعديلها في اللوحة لوحده مش كفاية.

---

## 1) الخلاصة في 3 صناديق

| المكان                                                        | عدد الأسرار                       | إيه اللي بيتحط فيه            |
| ------------------------------------------------------------- | --------------------------------- | ----------------------------- |
| **Vercel** → Settings → Environment Variables (Production)    | 4 إلزامي + 2 موصى بهم + 4 اختياري | Google Sheets + الدومين + GA4 |
| **Google Apps Script** → Project Settings → Script Properties | 2                                 | نفس قيمتين Vercel بالحرف      |
| **GitHub** → Settings → Secrets and variables → Actions       | 1                                 | مفتاح Gemini لمقالات الأسبوع  |

مفيش أي سر تاني في المشروع: لا Stripe ولا Paymob ولا Telegram ولا SMTP ولا Sentry حقيقي (الـ error sink داخلي `/api/errors`).

---

## 2) Vercel — Environment Variables

### 2-أ) إلزامي (من غيرهم الموقع بيقع وظيفيًا)

| المتغير                        | النوع     | لو ناقص إيه اللي يحصل                                                                                                                                                       |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_WEBHOOK_URL`    | Runtime   | **كل طلب شراء بيرجع 500** (`Server configuration error`) — مفيش أوردر بيتسجل. القيمة = رابط Apps Script المنشور، لازم ينتهي بـ `/exec`.                                     |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | Runtime   | في الإنتاج السيرفر بيرفض الطلب بـ 500 قبل ما يبعته أصلًا، لأن سكربت Google **Fail-Closed** بيرفض أي كتابة من غير السر. لازم يطابق `WEBHOOK_SECRET` في السكربت **حرف بحرف**. |
| `SITE_URL`                     | Runtime   | `https://alikhlasmedical.store` — بيدخل في الـ canonical والـ OG وروابط الـ feeds وتقرير الـ CSP. من غيره بيرجع للقيمة الافتراضية المكتوبة في الكود.                        |
| `VITE_WHATSAPP_NUMBER`         | **Build** | كل أزرار الواتساب بتتحول لرقم بديل/اختبار — يعني أكبر قناة بيع بتضيع. القيمة `201146044715` (بدون `+` وبدون مسافات).                                                        |

> ⚠️ `VITE_WHATSAPP_NUMBER` موجود حاليًا في `.env.production` (ملف متعقَّد في Git، ومحتواه عام وآمن). لو ضفته في Vercel كمان، **قيمته في Vercel هي اللي تكسب** — سيبهم متساويين ومتخالفهمش.

### 2-ب) موصى بهم (الموقع شغال بدونهم بس بتفقد ميزة)

| المتغير                       | النوع     | لو ناقص إيه اللي يحصل                                                                                       |
| ----------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_REVIEWS_TOKEN` | Runtime   | قسم «تجارب حقيقية من عملائنا» **يختفي بصمت** (يرجع قائمة فاضية). لازم يطابق `REVIEW_READ_TOKEN` في السكربت. |
| `VITE_GA_ID`                  | **Build** | `G-XXXXXXXXXX` — بتتحط تلقائيًا في 110+ صفحة. من غيرها التحليلات بتتعطّل من غير أخطاء.                      |

### 2-ج) اختياري / حسب الحالة

| المتغير               | النوع     | ملاحظات                                                                                            |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `GA_MEASUREMENT_ID`   | Runtime   | نفس `VITE_GA_ID` بس للسيرفر (قياس الـ pageview الاحتياطي). من غيره الـ endpoint بيرد 204 كـ no-op. |
| `GA_API_SECRET`       | Runtime   | السر اللي بيتولّد من GA4 → Admin → Data Streams → Measurement Protocol API secrets.                |
| `VITE_ERROR_SINK_URL` | **Build** | لو حبيت ترسل الأخطاء لـ Sentry-compatible بدل `/api/errors`. لازم تضيف دومينه في `connect-src`.    |
| `CSP_REPORT_ENDPOINT` | Runtime   | **مش مطلوب على Vercel** — الـ endpoint ثابت في `vercel.json`. بيفرق فقط في النشر الذاتي.           |

### 2-د) للنشر الذاتي فقط (VPS/Docker) — مش على Vercel

| المتغير               | ملاحظات                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                | افتراضي 8080.                                                                                                                      |
| `TRUST_PROXY_HOPS`    | `1` مع nginx/Caddy، `2` مع Cloudflare + nginx. من غيره كل الزوار بيتشاركوا نفس حدّ الـ rate-limit. متحطهوش لو الخادم مكشوف مباشرة. |
| `NODE_ENV=production` | بيفعّل الـ fail-closed checks + CSP الصارم.                                                                                        |

> في Vercel **متحطش** `PORT` ولا `TRUST_PROXY_HOPS` — Vercel بيحط `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` لوحده والسيرفر بيستخدمهم.

**بيئات Vercel:** ضيف الإلزامي على **Production** و**Preview** (لو بتجرّب على preview). سيبها فاضية أو استخدم شيت تجريبي في **Development** لو عايز تفصل بياناتك.

---

## 3) Google Apps Script — Script Properties

المكان: Apps Script → ⚙️ Project Settings → Script Properties. **نفس القيمتين بالحرف** — أي حرف زيادة أو مسافة سرية في الآخر = `Forbidden` في كل الطلبات.

| Property            | يقابل في Vercel                | إلزامي؟                 |
| ------------------- | ------------------------------ | ----------------------- |
| `WEBHOOK_SECRET`    | `GOOGLE_SHEETS_WEBHOOK_SECRET` | 🔴 إلزامي (Fail-Closed) |
| `REVIEW_READ_TOKEN` | `GOOGLE_SHEETS_REVIEWS_TOKEN`  | 🟡 لتفعيل المراجعات     |

بعد أي تعديل في السكربت: **Deploy → Manage deployments → Edit → New version** (نشر جديد فعلي، مش حفظ بس).

---

## 4) GitHub — Actions Secrets

المكان: `AhmedEideng/Alikhlas` → Settings → Secrets and variables → Actions.

| الاسم            | النوع      | مين بيستخدمه                                                                                                        | لو ناقص                                       |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `GEMINI_API_KEY` | **Secret** | `.github/workflows/auto-publish-articles.yml` (ومحليًا `npm run content:generate-article` + `npm run test:sources`) | الـ workflow الأسبوعي بيوقف من غير مقال جديد. |

مفيش أسرار تانية مطلوبة: `ci.yml` بيحط `SITE_URL` inline جوّه الملف، و`GITHUB_TOKEN` بيتوفر تلقائيًا.

**اختياري — لو هتنشر من GitHub بـ Vercel CLI** بدل الـ Git Integration:

| الاسم               | ملاحظات                                     |
| ------------------- | ------------------------------------------- |
| `VERCEL_TOKEN`      | من Vercel → Account Settings → Tokens       |
| `VERCEL_ORG_ID`     | من `.vercel/project.json` بعد `vercel link` |
| `VERCEL_PROJECT_ID` | نفس الملف                                   |

> إحنا حاليًا على Git Integration، فالتلاتة دول **مش محتاجينهم**. متضيفهمش من غير داعي.

Variables (مش Secrets): مفيش أي واحد مطلوب حاليًا.

---

## 5) محليًا (`.env` — مش بيتعملّه commit)

```bash
cp .env.example .env
```

- `GOOGLE_SHEETS_*` و`SITE_URL` و`VITE_GA_ID` — للتجربة المحلية.
- `GEMINI_API_KEY` — لتشغيل سكربت المقالات.
- `ARTICLE_DATE=2026-11-16` — لتثبيت تاريخ مقال بتولّده يدويًا (اختياري).
- `.gitignore` شغال على `.env` و`.env.local`. الملف الوحيد المتعقَّد هو `.env.production` وفيه **بس** `VITE_WHATSAPP_NUMBER` — أي سر بيتحط فيه = تسريب علني.

---

## 6) توليد الأسرار

كل سر لازم يكون **مختلف عن التاني** (سر الويب هوك ≠ توكن المراجعات) وطويل وعشوائي:

```bash
# 32 بايت عشوائي بصيغة آمنة في الـ URL
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# أو
openssl rand -base64 48
```

متستخدمش كلمات مفهومة، ولا نفس السر في أكتر من مكان، ولا تبعته في شات/تذكرة.

---

## 7) الإضافة بالأوامر (بدل اللوحة)

```bash
# Vercel — لكل متغير وكل بيئة
npx vercel env add GOOGLE_SHEETS_WEBHOOK_URL production        # هيسألك القيمة
npx vercel env add GOOGLE_SHEETS_WEBHOOK_SECRET production
npx vercel env add GOOGLE_SHEETS_REVIEWS_TOKEN production
npx vercel env add SITE_URL production                          # https://alikhlasmedical.store
npx vercel env add VITE_WHATSAPP_NUMBER production               # 201146044715
npx vercel env add VITE_GA_ID production                         # G-XXXXXXXXXX

# سحب القيم للمحلي (مش بيعمل commit)
npx vercel env pull .env.local

# GitHub
gh secret set GEMINI_API_KEY --repo AhmedEideng/Alikhlas
gh secret list --repo AhmedEideng/Alikhlas
```

بعد إضافة/تغيير **أي `VITE_*`**: `npx vercel --prod` أو Redeploy من اللوحة — وإلا الصفحات هتفضل بالنسخة القديمة.

---

## 8) تشيك ليست التحقق بعد الإضافة

1. `curl -s https://alikhlasmedical.store/api/health` → `{"status":"ok"}`
2. اعمل أوردر تجريبي من الموقع → الصف يظهر في شيت «الطلبات» في أقل من 10 ثواني.
3. `curl -s "https://alikhlasmedical.store/api/reviews?product=m-37"` → `{"reviews":[...]}` أو `{"reviews":[]}`، **مش 500**.
4. افتح الهوم على الموبايل → اضغط زرار واتساب → لازم يفتح على **+20 114 604 4715**.
5. `curl -s -X POST https://alikhlasmedical.store/api/ga-pageview -H 'content-type: application/json' -d '{}'` → 204/400 (مش 500).
6. GitHub → Actions → «Auto Publish Articles» → Run workflow → اللوج بيقول إن المفتاح موجود وبيكمّل.
7. Vercel → Deployments → آخر بناء من غير تحذير `Missing ... environment variable` في اللوج.

---

## 9) التدوير لو حاجة اتسربت

| السر                           | خطوات التدوير                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | (1) غيّره في Vercel + Redeploy، (2) غيّره في Script Properties + نشر نسخة جديدة. **بالترتيب ده** عشان مفيش نافذة رفض واسعة. |
| `GOOGLE_SHEETS_REVIEWS_TOKEN`  | نفس الخطوتين. أثر التدوير = المراجعات تختفي دقايق بس (fail-soft).                                                           |
| `GEMINI_API_KEY`               | من Google AI Studio → revoke القديم → أضف الجديد في GitHub Secret.                                                          |
| `GA_API_SECRET`                | GA4 → Data Streams → Measurement Protocol → أنشئ سر جديد واحذف القديم.                                                      |
| `GOOGLE_SHEETS_WEBHOOK_URL`    | أعد النشر في Apps Script كـ deployment جديد، ثم حدّث القيمة في Vercel.                                                      |

لو سر اتسرب في commit: اعتبره محروق و دوّره فورًا — حذف الـ commit مش كفاية لأن التاريخ محفوظ في GitHub.

---

## 10) حاجات **مش** أسرار (متضعهاش في Secrets)

- مفتاح IndexNow `ca00d9a1d17de02bfeac2599524619b3` — ملف عام في `public/` بالتصميم.
- `SITE_URL` على GitHub Actions — مكتوب inline في الـ workflow.
- `VITE_GA_ID`, `VITE_WHATSAPP_NUMBER` — عامين بطبيعتهم، بس بيفضلوا متغيرات بناء.
- ملف التحقق بتاع Google Search Console — ملف عام.

---

## 11) الجدول النهائي (انسخه وعلّم عليه)

| #   | الاسم                          | المكان                 | البيئة             | إلزامي؟         | ✅  |
| --- | ------------------------------ | ---------------------- | ------------------ | --------------- | --- |
| 1   | `GOOGLE_SHEETS_WEBHOOK_URL`    | Vercel                 | Production         | 🔴              | ☐   |
| 2   | `GOOGLE_SHEETS_WEBHOOK_SECRET` | Vercel                 | Production         | 🔴              | ☐   |
| 3   | `SITE_URL`                     | Vercel                 | Production         | 🔴              | ☐   |
| 4   | `VITE_WHATSAPP_NUMBER`         | Vercel                 | Production (Build) | 🔴              | ☐   |
| 5   | `GOOGLE_SHEETS_REVIEWS_TOKEN`  | Vercel                 | Production         | 🟡              | ☐   |
| 6   | `VITE_GA_ID`                   | Vercel                 | Production (Build) | 🟡              | ☐   |
| 7   | `GA_MEASUREMENT_ID`            | Vercel                 | Production         | ⚪              | ☐   |
| 8   | `GA_API_SECRET`                | Vercel                 | Production         | ⚪              | ☐   |
| 9   | `VITE_ERROR_SINK_URL`          | Vercel                 | Production (Build) | ⚪              | ☐   |
| 10  | `WEBHOOK_SECRET`               | Apps Script Properties | —                  | 🔴              | ☐   |
| 11  | `REVIEW_READ_TOKEN`            | Apps Script Properties | —                  | 🟡              | ☐   |
| 12  | `GEMINI_API_KEY`               | GitHub Actions Secret  | —                  | 🟡              | ☐   |
| 13  | `GEMINI_API_KEY`               | `.env` محلي            | —                  | ⚪              | ☐   |
| 14  | `ARTICLE_DATE`                 | `.env` محلي            | —                  | ⚪              | ☐   |
| 15  | `PORT`                         | VPS/Docker             | —                  | ⚪              | ☐   |
| 16  | `TRUST_PROXY_HOPS`             | VPS/Docker             | —                  | 🟡 (خلف بروكسي) | ☐   |

**الأقل المطلوب للموقع يشتغل صح = 1 + 2 + 3 + 4 + 10.** الباقي بيضيف ميزات.
