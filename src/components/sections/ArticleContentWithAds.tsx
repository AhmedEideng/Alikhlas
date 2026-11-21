import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/product-types";
import { ProductCard } from "@/components/ProductCard";
import { articleAdPositions, parseArticleBlocks } from "@/lib/article-blocks";

/**
 * محرك عرض متن المقال + حقن بطاقات المنتجات (In-Content Product Injection).
 *
 * (`src/lib/article-blocks.ts`): عناوين أقسام، عناوين فرعية، قوائم نقطية،
 * واقتباسات — بدل كتلة نص واحدة. ترتيب الحقن محسوب بـ `articleAdPositions`
 * في الطرفين، فالنسخة الثابتة والمتفاعلة متطابقتان.
 */
export function ArticleContentWithAds({
  content,
  linkedProducts,
}: {
  content: string;
  linkedProducts: Product[];
}) {
  // ترقيم الفقرات وأقسام h2 يُحسب مرة واحدة قبل الرسم، بدالة نقية بلا أي
  // إعادة إسناد لمتغيّر (قاعدة react-hooks/immutability تمنع العدّادات).
  const blocks = useMemo(() => {
    const parsed = parseArticleBlocks(content);
    const positions = (type: string) =>
      parsed.reduce<number[]>(
        (acc, block, index) => (block.type === type ? [...acc, index] : acc),
        [],
      );
    const paragraphAt = new Map(positions("p").map((pos, order) => [pos, order]));
    const headingAt = new Map(positions("h2").map((pos, order) => [pos, order + 1]));

    return parsed.map((block, index) => ({
      block,
      paragraphIndex: paragraphAt.get(index),
      id: headingAt.has(index) ? `section-${headingAt.get(index)}` : undefined,
    }));
  }, [content]);

  const paragraphCount = useMemo(
    () => blocks.filter((entry) => entry.block.type === "p").length,
    [blocks],
  );
  const adPositions = useMemo(
    () => articleAdPositions(paragraphCount, linkedProducts.length),
    [paragraphCount, linkedProducts.length],
  );

  const adFor = (paragraphIndex: number) => {
    const hit = adPositions.find((position) => position.index === paragraphIndex);
    return hit ? linkedProducts[hit.productIndex] : undefined;
  };

  return (
    <div className="prose prose-lg max-w-none text-start text-foreground" dir="rtl">
      <div className="whitespace-pre-line text-base leading-loose md:text-lg">
        {blocks.map(({ block, paragraphIndex, id }, i) => {
          const ad = paragraphIndex === undefined ? undefined : adFor(paragraphIndex);

          return (
            <React.Fragment key={i}>
              {block.type === "h2" ? (
                <h2
                  id={id}
                  className="mb-3 mt-9 scroll-mt-24 flex items-center gap-2.5 text-xl font-black leading-snug text-[#0b3b26] first:mt-0 md:text-[1.45rem]"
                >
                  <span aria-hidden className="h-5 w-[3px] shrink-0 rounded-full bg-[#e3ac21]" />
                  {block.text}
                </h2>
              ) : null}

              {block.type === "h3" ? (
                <h3 className="mb-2 mt-6 text-[17px] font-black leading-snug text-[#0b6b3a] md:text-lg">
                  {block.text}
                </h3>
              ) : null}

              {block.type === "p" ? (
                <p className="mb-4 text-[15px] leading-8 text-[#33413a] md:text-[16.5px] md:leading-9">
                  {block.text}
                </p>
              ) : null}

              {block.type === "quote" ? (
                <blockquote className="my-6 rounded-2xl border border-[#e8c473] bg-[linear-gradient(105deg,#fffaef,#ffffff)] px-5 py-4 text-[15px] font-bold leading-8 text-[#0b3b26] md:text-base">
                  <span aria-hidden className="mb-1 block h-[3px] w-10 rounded-full bg-[#e3ac21]" />
                  {block.text}
                </blockquote>
              ) : null}

              {block.type === "ul" ? (
                <ul className="mb-5 space-y-2">
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[14.5px] leading-7 text-[#33413a] md:text-[15.5px] md:leading-8"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#e9b62c]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Product Injection */}
              {ad && (
                <div className="group relative my-8 overflow-hidden rounded-3xl border border-[#e8c473] bg-[linear-gradient(120deg,#fffaef,#ffffff_65%)] p-4 shadow-[0_18px_40px_-34px_rgba(11,59,38,0.55)] sm:p-6">
                  <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-[#0b6b3a] px-3 py-1 text-[10px] font-bold text-white">
                    منتج مرتبط بالموضوع
                  </div>
                  <div className="flex flex-col items-center gap-6 sm:flex-row">
                    <div className="w-full max-w-[220px] sm:w-1/3">
                      <ProductCard product={ad} />
                    </div>
                    <div className="w-full space-y-3 text-center sm:w-2/3 sm:text-right">
                      {/* (2026-11-15 · SEO) h2 لا h3: البلوك يقع مباشرة بعد h1
                          داخل متن المقال، وh3 كان يصنع قفزة h1→h3 في HTML
                          الثابت (15 مقالة). مطابق لـ prerender-seo.mjs. */}
                      <h2 className="!mb-0 !mt-0 text-xl font-black text-[#0b3b26]">{ad.name}</h2>
                      <p className="!mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {ad.description}
                      </p>
                      <Link
                        to="/products/$slug"
                        params={{ slug: ad.slug }}
                        className="inline-flex w-full justify-center rounded-full bg-gradient-brand px-6 py-3 font-black text-white shadow-md transition-transform hover:scale-[1.02] sm:w-auto"
                      >
                        عرض المنتج والشراء
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
