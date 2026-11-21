/**
 * Google Tag Manager bootstrapper: Al Ikhlas Medical
 * ============================================================
 * (2026-11-23) بديل مطابق للسلوك القياسي لِسنيبت GTM، لكن من ملف على نفس
 * النطاق بدل سكربت مضمَّن (inline):
 *
 *   • سياسة CSP عندنا تسمح بـ script-src 'self' + مضيفات جوجل فقط. السنيبت
 *     المضمَّن كان يحتاج إضافة hash جديد للسياسة عند كل تعديل، والملف المحلي
 *     يمرّ من 'self' بلا أي استثناء جديد.
 *   • المعرّف يصل من `data-gtm-id` المكتوب في index.html (رَمز __GTM_ID__
 *     يستبدله prerender من src/lib/site-config.ts) فلا معرّف مكتوب هنا.
 *   • لا شيء يعمل لو لم يكن هناك معرّف صالح: صفر طلبات لشبكة جوجل.
 *
 * dataLayer موجود بالفعل في src/lib/analytics.ts وهو يدفع أحداث التجارة
 * الإلكترونية (view_item, add_to_cart, begin_checkout, purchase, whatsapp…)،
 * فبمجرد تحميل الحاوية تصبح كل هذه الأحداث متاحة لمشغّلات GTM.
 */
(function () {
  var self = document.currentScript;
  var raw = (self && self.getAttribute("data-gtm-id")) || "";
  var id = String(raw).trim().toUpperCase();

  if (!/^GTM-[A-Z0-9]{4,}$/.test(id)) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  // يُقرأ في src/lib/analytics.ts: عندما يكون GTM هو الوسيط ندفع كائنات
  // عادية (Custom Event) لأن مشغّلات GTM لا تتعامل مع صيغة أوامر gtag.
  window.__IKHLAS_GTM__ = id;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id);
  document.head.appendChild(script);
})();
