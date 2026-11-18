/**
 * 📅 تاريخ المقالات = يوم إنشائها، لا تاريخ آخر.
 *
 * القاعدة الملزِمة لأي مقال يُضاف الآن أو بعد سنوات:
 *   1. `publishedAt` و`updatedAt` بصيغة YYYY-MM-DD صالحة.
 *   2. لا تاريخ في المستقبل (المقارنة بيوم القاهرة، لا UTC).
 *   3. `publishedAt` لا يتجاوز `updatedAt`.
 *   4. مولّد المقالات يستخدم `resolveContentDate` (القاهرة) ولا يستخدم
 *      `toISOString().slice(0, 10)` الذي يُنتج تاريخ اليوم السابق ليلًا.
 *   5. `todayInCairo` يتبع توقيت القاهرة فعليًا (منتصف الليل المصري = يوم جديد).
 *   6. الـsitemap يأخذ تاريخ المقالات من بياناتها، والفهرس من أحدث مقال.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { articles } from "@/data/articles";
import { isIsoDate, resolveContentDate, todayInCairo } from "@/lib/cairo-date";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf-8");

describe("تاريخ المقالات = يوم الإنشاء", () => {
  it("كل مقال له تاريخ إنشاء صالح بصيغة YYYY-MM-DD", () => {
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      expect(isIsoDate(article.publishedAt), `${article.slug}: publishedAt`).toBe(true);
      expect(isIsoDate(article.updatedAt), `${article.slug}: updatedAt`).toBe(true);
    }
  });

  it("لا مقال بتاريخ إنشاء أو تحديث في المستقبل", () => {
    const today = todayInCairo();
    for (const article of articles) {
      expect(
        article.publishedAt <= today,
        `${article.slug}: publishedAt (${article.publishedAt}) بعد اليوم (${today})`,
      ).toBe(true);
      expect(
        article.updatedAt <= today,
        `${article.slug}: updatedAt (${article.updatedAt}) بعد اليوم (${today})`,
      ).toBe(true);
    }
  });

  it("تاريخ النشر لا يتجاوز تاريخ آخر تحديث", () => {
    for (const article of articles) {
      expect(
        article.publishedAt <= article.updatedAt,
        `${article.slug}: publishedAt أحدث من updatedAt`,
      ).toBe(true);
    }
  });
});

describe("مولّد المقالات يسجّل يوم الإنشاء في توقيت القاهرة", () => {
  const generator = read("scripts/auto-generate-article.mjs");

  it("يستخدم resolveContentDate لا تاريخ UTC المقطوع", () => {
    expect(generator).toContain("resolveContentDate");
    expect(generator).not.toMatch(/toISOString\(\)\s*\.\s*slice\(0,\s*10\)/);
  });

  it("تاريخ publishedAt/updatedAt يأتي من نفس المصدر", () => {
    expect(generator).toMatch(/publishedAt:\s*todayStr/);
    expect(generator).toMatch(/updatedAt:\s*todayStr/);
  });
});

describe("todayInCairo — توقيت القاهرة لا UTC", () => {
  it("بعد منتصف الليل بتوقيت مصر بيومين عن UTC يكون اليوم التالي", () => {
    // 22:30 UTC في نوفمبر = 00:30 في القاهرة (UTC+2) → يوم جديد.
    expect(todayInCairo(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-17");
    // 21:30 UTC = 23:30 في القاهرة → نفس اليوم.
    expect(todayInCairo(new Date("2026-11-16T21:30:00Z"))).toBe("2026-11-16");
  });

  it("يتبع التوقيت الصيفي المصري تلقائيًا (UTC+3 في يوليو)", () => {
    // 21:30 UTC في يوليو = 00:30 في القاهرة (UTC+3) → يوم جديد.
    expect(todayInCairo(new Date("2026-07-14T21:30:00Z"))).toBe("2026-07-15");
  });

  it("تاريخ الإنشاء اليدوي يُقبل بصيغة صحيحة ويُرفض بغيرها", () => {
    expect(resolveContentDate({ override: "2026-03-01" })).toBe("2026-03-01");
    expect(resolveContentDate({ override: "  2026-03-01  " })).toBe("2026-03-01");
    expect(resolveContentDate({ override: "" })).toBe(todayInCairo());
    expect(() => resolveContentDate({ override: "01/03/2026" })).toThrow();
    expect(() => resolveContentDate({ override: "2026-02-31" })).toThrow();
    expect(isIsoDate("2026-02-31")).toBe(false);
  });
});

describe("الـsitemap يحمل تاريخ المقال نفسه", () => {
  const sitemap = read("scripts/generate-sitemap.mjs");

  it("تاريخ كل مقال من بياناته لا من تاريخ الملف", () => {
    expect(sitemap).toMatch(/lastmod:\s*a\.updatedAt\s*\|\|\s*a\.publishedAt/);
  });

  it("فهرس المكتبة يأخذ تاريخ أحدث مقال", () => {
    expect(sitemap).toContain("latestArticleDate");
    expect(sitemap).toMatch(/path:\s*"\/education"[\s\S]{0,400}lastmod:\s*latestArticleDate/);
  });

  it("يمنع إرسال lastmod في المستقبل", () => {
    expect(sitemap).toContain("TODAY_IN_CAIRO");
    expect(sitemap).toMatch(/>\s*TODAY_IN_CAIRO\s*\?\s*TODAY_IN_CAIRO/);
  });
});
