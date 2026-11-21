/**
 * محرّك تنسيق نصوص المقالات — مصدر واحد يقرأه React وقت التشغيل والسكربت
 * الثابت وقت البناء (scripts/prerender-seo.mjs)، حتى يرى الزائر ومحرك البحث
 * نفس البنية تمامًا.
 *
 * الصيغة داخل `Article.content` (نص عادي مفصول بسطر فارغ):
 *   ## عنوان قسم        ← h2
 *   ### عنوان فرعي      ← h3
 *   - بند                ← قائمة نقطية (كل سطر يبدأ بـ "- ")
 *   > اقتباس             ← اقتباس تأكيدي (pull quote)
 *   أي سطر آخر           ← فقرة عادية
 *
 * لا عناوين، لا قوائم، لا تنفّس بصري — وهي أكبر مشكلة في «محتوى بشري طويل».
 */

export type ArticleBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] };

/** يحوّل نص المقال إلى بلوكات قابلة للرسم في الواجهتين. */
export function parseArticleBlocks(content: string): ArticleBlock[] {
  const lines = String(content ?? "").split("\n");
  const blocks: ArticleBlock[] = [];
  let buffer: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ type: "p", text });
    buffer = [];
  };

  const flushList = () => {
    if (list.length) blocks.push({ type: "ul", items: [...list] });
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (list.length) flushList();
      else flushParagraph();
      continue;
    }

    if (line.startsWith("## ") || line.startsWith("### ")) {
      flushList();
      flushParagraph();
      const text = line.replace(/^#+\s*/, "").trim();
      blocks.push({ type: line.startsWith("### ") ? "h3" : "h2", text });
      continue;
    }

    if (line.startsWith("«") || line.startsWith("> ")) {
      flushList();
      flushParagraph();
      blocks.push({ type: "quote", text: line.replace(/^>\s*/, "").trim() });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }

    if (list.length) flushList();
    buffer.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

/**
 * مواضع حقن بطاقات المنتجات داخل المقال — دالة واحدة يستدعيها الطرفان
 * (React والبناء الثابت) لضمان تطابق النسختين حرفيًا.
 */
export function articleAdPositions(
  paragraphCount: number,
  productCount: number,
): { index: number; productIndex: number }[] {
  if (paragraphCount < 4 || productCount === 0) return [];
  if (productCount === 1 || paragraphCount < 8) {
    return [{ index: Math.floor(paragraphCount / 2), productIndex: 0 }];
  }
  return [
    { index: Math.floor(paragraphCount / 3), productIndex: 0 },
    { index: Math.floor((paragraphCount * 2) / 3), productIndex: 1 },
  ];
}

/** عدد الفقرات المرئية (تُحسب قبل الحقن بنفس الطريقة في الطرفين). */
export const countArticleParagraphs = (content: string): number =>
  parseArticleBlocks(content).filter((block) => block.type === "p").length;

/** عناوين الأقسام الرئيسية (h2) بأرقام ثابتة تُستخدم في فهرس المقال وروابطه. */
export function articleSections(content: string): { id: string; text: string }[] {
  return parseArticleBlocks(content)
    .filter((block) => block.type === "h2")
    .map((block, index) => ({ id: `section-${index + 1}`, text: block.text }));
}
