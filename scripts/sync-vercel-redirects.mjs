/**
 * يضبط `vercel.json` على قواعد المنصة فقط (توجيه النطاق www → النطاق الأساسي).
 *
 * لا يولّد هذا السكربت أي توجيه لمسارات المنتجات: كل منتج له رابط واحد نهائي
 * مكتوب في بياناته (`slug`)، ولا توجد روابط قديمة تحتاج تحويلًا.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const vercelPath = resolve(ROOT, "vercel.json");

const vercel = JSON.parse(readFileSync(vercelPath, "utf-8"));

const isHostScoped = (rule) => Array.isArray(rule.has) && rule.has.length > 0;
const platformRules = (vercel.redirects || []).filter(isHostScoped);

const coreAliases = [
  { source: "/index.html", destination: "/", permanent: true },
  { source: "/index", destination: "/", permanent: true },
];

vercel.redirects = [...platformRules, ...coreAliases];
writeFileSync(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`, "utf-8");

console.log(`✓ vercel.json: ${vercel.redirects.length} rule(s), no product redirects`);
