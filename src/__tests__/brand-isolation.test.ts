import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { describe, expect, it } from "vitest";

/**
 *
 * السؤال الذي بُني عليه هذا الملف: «هل يوجد أي شيء في الموقع يدل على علاقة
 * بمتجر/علامة أخرى؟». المراجعة اليدوية أجابت «لا» وقت كتابة الملف، لكن الجواب
 * يبقى صحيحًا فقط لو كل بناء جديد أُعيد فحصه: المحتوى المولَّد آليًا، والصور،
 * والبيانات، وإخراج الـ build نفسه — كلها قابلة لإدخال اسم علامة أخرى دون أن
 * يلاحظ أحد (خصوصًا «اليسر» التي تشبه هذا السوق).
 *
 * لذلك: أي ظهور لهذه العلامات في المصدر أو في HTML المبني = فشل اختبار.
 */
const ROOT = resolve(__dirname, "../..");

/** العلامات الممنوعة: المتجر المنافس بصيغه العربية واللاتينية. */
const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "اليسر", re: /اليسر/ },
  { name: "اليُسر (بالتشكيل)", re: /اليُسر/ },
  { name: "Al Yusr (لاتيني)", re: /al[ _-]?yusr/i },
  { name: "AlYusr", re: /alyusr/i },
  { name: "Yusr Medical", re: /yusr[ _-]?medical/i },
];

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".html",
  ".css",
  ".md",
  ".txt",
  ".xml",
  ".csv",
  ".webmanifest",
]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "test-results",
  "playwright-report",
  "coverage",
  "__pycache__",
]);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(entry)) || entry === "index.html") out.push(full);
  }
  return out;
}

const SOURCE_FILES = [
  ...walk(resolve(ROOT, "src")),
  ...walk(resolve(ROOT, "scripts")),
  ...walk(resolve(ROOT, "config")),
  ...walk(resolve(ROOT, "public")),
  ...walk(resolve(ROOT, "server")),
  ...walk(resolve(ROOT, "api")),
  resolve(ROOT, "index.html"),
  resolve(ROOT, "vercel.json"),
  resolve(ROOT, "README.md"),
  resolve(ROOT, "package.json"),
];

describe("عزل هوية العلامة", () => {
  it("لا يوجد أي ذكر لعلامة/متجر آخر في ملفات المصدر", () => {
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      if (!existsSync(file)) continue;
      // هذا الملف يحتوي العلامات نفسها كنمط فحص — يُستثنى.
      if (file.endsWith("brand-isolation.test.ts")) continue;
      let text: string;
      try {
        text = readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      // سكربت توليد المقالات يَعرِف العلامات لأنه يحجبها — نستثني سطر
      // قائمة الحجب وحدها، ويبقى فحص باقي الملف قائمًا (اختبار منفصل يتأكد
      // أن قائمة الحجب نفسها ما زالت موجودة).
      const scanned = file.endsWith("auto-generate-article.mjs")
        ? text.replace(/^\s*const COMPETITOR_MARKERS[\s\S]*?;\s*$/m, "")
        : text;

      for (const { name, re } of FORBIDDEN) {
        if (re.test(scanned)) offenders.push(`${file.replace(ROOT + "/", "")} → «${name}»`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("لا يوجد أي ذكر لعلامة أخرى في الـ HTML المبني (إن وُجد dist)", () => {
    const distDir = resolve(ROOT, "dist");
    if (!existsSync(distDir)) return; // البناء لم يُنفَّذ بعد — الفحص يتخطى بهدوء
    const offenders: string[] = [];
    for (const file of walk(distDir)) {
      if (extname(file) !== ".html") continue;
      const text = readFileSync(file, "utf-8");
      for (const { name, re } of FORBIDDEN) {
        if (re.test(text)) offenders.push(`${file.replace(ROOT + "/", "")} → «${name}»`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("مولّد المقالات الآلي يرفض ذكر أي علامة أخرى قبل كتابة أي ملف", () => {
    const script = readFileSync(resolve(ROOT, "scripts/auto-generate-article.mjs"), "utf-8");
    expect(script).toContain("COMPETITOR_MARKERS");
    expect(script).toMatch(/NEVER mention another store/);
  });

  it("اسم العلامة وأرقام التواصل موحّدة في كل الواجهة", () => {
    // (يُضبط من VITE_WHATSAPP_NUMBER)؛ whatsapp.ts يعيد تصديره بلا رقم حرفي.
    const config = readFileSync(resolve(ROOT, "src/lib/site-config.ts"), "utf-8");
    expect(config).toContain('const PLACEHOLDER_WHATSAPP = "201000000000"');
    const whatsapp = readFileSync(resolve(ROOT, "src/lib/whatsapp.ts"), "utf-8");
    expect(whatsapp).not.toMatch(/\d{12}/);
    const manifest = readFileSync(resolve(ROOT, "public/site.webmanifest"), "utf-8");
    expect(manifest).toContain("الإخلاص");
    const seo = readFileSync(resolve(ROOT, "src/lib/seo.ts"), "utf-8");
    // الأصل يُضبط اختياريًا بـ VITE_SITE_URL، والدومين الرسمي هو الاحتياط الوحيد.
    expect(seo).toContain('"https://alikhlasmedical.store"');
    expect(seo).toContain("VITE_SITE_URL");
    const hosts = [
      ...new Set(
        (seo.match(/https:\/\/[a-z0-9.-]+/g) ?? []).filter((u) => !u.includes("schema.org")),
      ),
    ];
    expect(hosts).toEqual(["https://alikhlasmedical.store"]);
  });
});
