import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { products } from "@/data/products";
import { articles } from "@/data/articles";

/**
 * ============================================================
 * حارس صور المنتجات (Brand product images)
 * ============================================================
 * كل صورة منتج في المتجر يجب أن تكون نسخة **مركّبة بهوية المتجر**
 * (انتهاء الاسم بـ `-brand.webp`) لا ملف المورّد الخام الذي يتشاركه
 * طرف آخر من إعادة استخدام الصورة (العلامة المائية جزء من التكوين).
 *
 * ما يحرسه هذا الملف:
 *   1. كل منتج له صورة `-brand.webp` واسمها مطابق للـ slug.
 *   2. الصورة الأساسية 800×800 (مربعة، لا تشويه بنسبة مختلفة).
 *   3. المصغّرات الثلاثة موجودة بالمقاسات المستخدمة في الكارت
 *      (thumbs=480 · thumbs-180=360 · thumbs-120=240).
 *   4. لا صورة تتجاوز ميزانية الحجم (120 كيلوبايت) — الصفحة تُبنى بـ
 *      صور كروت صغيرة، وأي صورة أثقل تُبطئ LCP.
 */

const BUDGET_KB = 120;
const ROOT = resolve(__dirname, "../..");
const THUMBS: [dir: string, size: number][] = [
  ["thumbs", 480],
  ["thumbs-180", 360],
  ["thumbs-120", 240],
];

const abs = (publicPath: string) => resolve(ROOT, "public", publicPath.replace(/^\//, ""));

describe("brand product images", () => {
  it("every product points at its own brand creative", () => {
    const offenders: string[] = [];
    for (const product of products) {
      const expected = `/images/${product.slug}-brand.webp`;
      if (product.image !== expected)
        offenders.push(`${product.id}: ${product.image} ≠ ${expected}`);
    }
    expect(offenders, `صور ليست بنسخة المتجر:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("every brand file exists, is square 800×800 and within budget", async () => {
    const problems: string[] = [];
    for (const product of products) {
      const file = abs(product.image ?? "");
      if (!existsSync(file)) {
        problems.push(`${product.id}: missing ${product.image}`);
        continue;
      }
      const kb = statSync(file).size / 1024;
      if (kb > BUDGET_KB) problems.push(`${product.id}: ${Math.round(kb)}KB > ${BUDGET_KB}KB`);
      const meta = await sharp(file).metadata();
      if (meta.width !== 800 || meta.height !== 800)
        problems.push(`${product.id}: ${meta.width}×${meta.height} ≠ 800×800`);
    }
    expect(problems, `مشاكل في ملفات الصور:\n${problems.join("\n")}`).toEqual([]);
  });

  it("all three thumb sizes exist at the exact dimensions the cards request", async () => {
    const problems: string[] = [];
    for (const product of products) {
      const base = (product.image ?? "").replace("/images/", "");
      for (const [dir, size] of THUMBS) {
        const file = abs(`/images/${dir}/${base}`);
        if (!existsSync(file)) {
          problems.push(`${product.id}: missing ${dir}/${base}`);
          continue;
        }
        const meta = await sharp(file).metadata();
        if (meta.width !== size || meta.height !== size)
          problems.push(
            `${product.id}: ${dir} is ${meta.width}×${meta.height}, expected ${size}×${size}`,
          );
      }
    }
    expect(problems, `مشاكل في المصغّرات:\n${problems.join("\n")}`).toEqual([]);
  });

  it("keeps a single creative per product (no shared bytes)", async () => {
    const byHash = new Map<string, string>();
    const clashes: string[] = [];
    for (const product of products) {
      const file = abs(product.image ?? "");
      const hash = await sharp(file)
        .stats()
        .then((s) => s.channels.map((c) => Math.round(c.mean * 100)).join("-"));
      const key = `${hash}:${statSync(file).size}`;
      const owner = byHash.get(key);
      if (owner) clashes.push(`${owner} ↔ ${product.id}`);
      else byHash.set(key, product.id);
    }
    expect(clashes, `صور متطابقة بين منتجات:\n${clashes.join("\n")}`).toEqual([]);
  });

  it("article hero images are branded too", () => {
    const offenders: string[] = [];
    for (const article of articles) {
      const image = article.image ?? "";
      if (!image.endsWith("-brand.webp")) offenders.push(`${article.slug}: ${image}`);
      else if (!existsSync(abs(image))) offenders.push(`${article.slug}: missing ${image}`);
    }
    expect(offenders, `صور مقالات غير مركّبة:\n${offenders.join("\n")}`).toEqual([]);
  });
});
