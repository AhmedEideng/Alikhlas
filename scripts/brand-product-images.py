#!/usr/bin/env python3
"""
============================================================
Brand product images — يولّد «كرييتيف» أصلي لكل منتج
============================================================
الفكرة:
  صورة المنتج الحقيقية تبقى كما هي (العميل لازم يشوف العلبة اللي
  هتوصله)، لكنها تُركَّب داخل تكوين خاص بالمتجر: خلفية بهوية
  الإخلاص، بطاقة بيضاء، شريحة تصنيف، اسم المنتج بالعربي، فاصل
  ذهبي، وعلامة مائية للعلامة التجارية.

  النتيجة: ملف مختلف تمامًا عن ملفات المورّد/المنافس (نفس الصورة
  الأصلية، لكن التركيب والتكوين والإطار والعلامة مائية خاصة بنا)،
  ويصعب إعادة استخدامه. لا يُكتب اسم المنتج على الصورة (قرار المالك)
  لأن الاسم موجود في الكارت وصفحة المنتج.

الاستخدام:
  python3 scripts/brand-product-images.py <catalog.json> <out_dir> [--style light|dark|both] [--ids m-05,m-12]

  catalog.json: مصفوفة عناصر فيها id, slug, name, category, image
                (تُولَّد من الكتالوج عبر dump في scripts/generate-*)

المتطلبات: Pillow (مع دعم raqm للنص العربي) + خط Cairo (wght 400/700/900)
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W = H = 800

EMERALD = (15, 92, 74)
EMERALD_DEEP = (9, 58, 47)
GOLD = (198, 160, 74)
CREAM = (247, 245, 239)
MINT = (230, 239, 233)

# ── بالِت البلاطة الذهبية (v6) — الحواف دهبي مش زمردي ──
GOLD_PALE = (247, 238, 214)
GOLD_PALE_DEEP = (231, 205, 140)
GOLD_MID = (212, 160, 23)
GOLD_DEEP = (146, 106, 12)
WHITE = (255, 255, 255)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.environ.get("CAIRO_FONT_DIR", os.path.expanduser("~/.fonts/full"))
LOGO = os.path.join(ROOT, "public", "logo.png")

CATEGORY_LABEL = {"men": "رجال", "women": "نساء", "devices": "أجهزة"}


def font(weight: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, f"cairo-{weight}.ttf"), 10)


def vgrad(size, top, bottom):
    w, h = size
    strip = Image.new("RGB", (1, h))
    d = ImageDraw.Draw(strip)
    for y in range(h):
        t = y / max(h - 1, 1)
        d.point((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return strip.resize((w, h))


def trim_white(im, tol=246):
    """يقصّ الهوامش البيضاء حول صورة المنتج حتى يستفيد الكادر من المساحة."""
    rgb = im.convert("RGB")
    bg = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, bg).convert("L").point(lambda p: 255 if p > (255 - tol) else 0)
    bbox = diff.getbbox()
    return im.crop(bbox) if bbox else im


def rmask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def display_name(name: str) -> str:
    """الاسم العربي فقط — الاسم الإنجليزي بين قوسين يُحذف من الكارت."""
    arabic = name.split("(")[0].strip(" -—")
    return arabic or name


def build(photo_path, name, category, out_path, style="light"):
    dark = style == "dark"
    canvas = vgrad((W, H), *((EMERALD_DEEP, (6, 40, 33)) if dark else (CREAM, MINT))).convert("RGBA")

    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    if dark:
        dd.ellipse([-200, -240, 340, 300], fill=(255, 255, 255, 10))
        dd.ellipse([540, 500, 920, 880], outline=GOLD + (70,), width=6)
        dd.ellipse([600, 560, 860, 820], outline=GOLD + (34,), width=3)
    else:
        dd.ellipse([-180, -220, 320, 280], fill=EMERALD + (16,))
        dd.ellipse([560, 520, 900, 860], outline=GOLD + (110,), width=6)
        dd.ellipse([610, 570, 850, 810], outline=GOLD + (55,), width=3)
    canvas = Image.alpha_composite(canvas, deco)

    card = [48, 44, W - 48, H - 96]
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [card[0], card[1] + 12, card[2], card[3] + 14],
        radius=46,
        fill=(0, 0, 0, 70 if dark else 45),
    )
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(16)))

    card_img = Image.new("RGBA", (card[2] - card[0], card[3] - card[1]), (0, 0, 0, 0))
    plate = (255, 255, 255) if not dark else (250, 249, 245)
    card_img.paste(Image.new("RGBA", card_img.size, plate + (255,)), (0, 0), rmask(card_img.size, 46))
    if dark:
        ImageDraw.Draw(card_img).rounded_rectangle(
            [18, 18, card_img.size[0] - 18, card_img.size[1] - 18],
            radius=34,
            outline=GOLD + (90,),
            width=2,
        )
    canvas.alpha_composite(card_img, (card[0], card[1]))

    photo = trim_white(Image.open(photo_path).convert("RGBA"))
    avail_w, avail_h = card[2] - card[0] - 170, 400
    ratio = min(avail_w / photo.width, avail_h / photo.height)
    photo = photo.resize((max(1, int(photo.width * ratio)), max(1, int(photo.height * ratio))), Image.LANCZOS)
    canvas.alpha_composite(photo, (card[0] + (card[2] - card[0] - photo.width) // 2, 126))

    d = ImageDraw.Draw(canvas)

    cat_label = CATEGORY_LABEL.get(category, "منتجات")
    cat_font = font(700)
    cat_font = ImageFont.truetype(cat_font.path, 28)
    tw = d.textlength(cat_label, font=cat_font)
    pill = [card[2] - 40 - (tw + 52), 74, card[2] - 40, 126]
    pl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(pl).rounded_rectangle(pill, radius=26, fill=(GOLD if dark else EMERALD) + (255,))
    canvas = Image.alpha_composite(canvas, pl)
    d = ImageDraw.Draw(canvas)
    d.text(
        ((pill[0] + pill[2]) // 2, (pill[1] + pill[3]) // 2),
        cat_label,
        font=cat_font,
        fill=(24, 40, 34) if dark else (255, 250, 235),
        anchor="mm",
        direction="rtl",
        language="ar",
    )

    label = display_name(name)
    size = 38
    name_font = ImageFont.truetype(cat_font.path.replace("cairo-700", "cairo-900"), size)
    max_w = card[2] - card[0] - 120
    lines = wrap(d, label, name_font, max_w)
    while len(lines) > 2 and size > 28:
        size -= 2
        name_font = ImageFont.truetype(name_font.path, size)
        lines = wrap(d, label, name_font, max_w)
    lines = lines[:2]
    y = card[3] - 96 - (len(lines) - 1) * (size + 12)
    for line in lines:
        d.text(
            (W // 2, y),
            line,
            font=name_font,
            fill=EMERALD_DEEP,
            anchor="mm",
            direction="rtl",
            language="ar",
        )
        y += size + 12
    d.rounded_rectangle([W // 2 - 44, card[3] - 44, W // 2 + 44, card[3] - 38], radius=3, fill=GOLD)

    logo = Image.open(LOGO).convert("RGBA").resize((52, 52), Image.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda p: int(p * (0.85 if dark else 0.6))))
    canvas.alpha_composite(logo, (64, H - 84))
    bf = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-700.ttf"), 23)
    d = ImageDraw.Draw(canvas)
    d.text(
        (128, H - 58),
        "الإخلاص ميديكال",
        font=bf,
        fill=(240, 236, 224, 210) if dark else EMERALD_DEEP + (170,),
        anchor="lm",
        direction="rtl",
        language="ar",
    )

    canvas.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def build_brand(photo_path, name, category, out_path):
    """الأسلوب المعتمد (v6): بلاطة ذهبية + المنتج بأقصى حجم + بدون اسم.

    قرار المالك: حواف الصورة والمحيط دهبي — الزمردي مش مطلوب، فاتحصر في
    شريحة التصنيف الصغيرة كلمسة تمييز فقط. اسم المنتج لا يُكتب على الصورة
    (الاسم موجود في الكارت وصفحة المنتج)، فيأخذ المنتج ≈80% من الارتفاع.
    """
    canvas = vgrad((W, H), GOLD_PALE, GOLD_PALE_DEEP).convert("RGBA")

    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for x in range(-H, W, 46):
        dd.line([(x, 0), (x + H, H)], fill=(255, 255, 255, 10), width=10)
    dd.ellipse([-140, -180, 380, 340], fill=(255, 255, 255, 26))
    dd.ellipse([540, 560, 920, 940], outline=GOLD_MID + (90,), width=7)
    canvas = Image.alpha_composite(canvas, deco)

    # الإطار: خط دهبي غامق سميك على الحافة + خط أبيض رفيع جوّاه
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle([10, 10, W - 10, H - 10], radius=26, outline=GOLD_DEEP + (210,), width=5)
    fd.rounded_rectangle([24, 24, W - 24, H - 24], radius=18, outline=(255, 255, 255, 130), width=1)
    canvas = Image.alpha_composite(canvas, frame)

    # شريط علوي رفيع: لوجو + اسم العلامة + شريحة التصنيف
    logo = Image.open(LOGO).convert("RGBA").resize((42, 42), Image.LANCZOS)
    canvas.alpha_composite(logo, (42, 28))
    d = ImageDraw.Draw(canvas)
    bf = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-900.ttf"), 23)
    d.text((94, 49), "الإخلاص ميديكال", font=bf, fill=GOLD_DEEP, anchor="lm",
           direction="rtl", language="ar")

    cat_label = CATEGORY_LABEL.get(category, "منتجات")
    cat_font = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-700.ttf"), 22)
    tw = d.textlength(cat_label, font=cat_font)
    pill = [W - 42 - (tw + 38), 27, W - 42, 71]
    pl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # الزمردي باقي كلمسة تمييز واحدة فقط (شريحة التصنيف)
    ImageDraw.Draw(pl).rounded_rectangle(pill, radius=20, fill=EMERALD + (255,))
    canvas = Image.alpha_composite(canvas, pl)
    d = ImageDraw.Draw(canvas)
    d.text(((pill[0] + pill[2]) // 2, (pill[1] + pill[3]) // 2), cat_label, font=cat_font,
           fill=(255, 250, 235), anchor="mm", direction="rtl", language="ar")

    # نافذة المنتج: من تحت الشريط العلوي إلى قرب الحافة السفلية (بدون اسم)
    plate_box = [26, 82, W - 26, 748]
    plate = Image.new("RGBA", (plate_box[2] - plate_box[0], plate_box[3] - plate_box[1]), (0, 0, 0, 0))
    plate.paste(Image.new("RGBA", plate.size, (255, 255, 255, 255)), (0, 0), rmask(plate.size, 24))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [plate_box[0], plate_box[1] + 8, plate_box[2], plate_box[3] + 10], radius=24, fill=(0, 0, 0, 70)
    )
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(12)))
    canvas.alpha_composite(plate, (plate_box[0], plate_box[1]))
    pf = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(pf).rounded_rectangle(plate_box, radius=24, outline=(255, 255, 255, 150), width=2)
    canvas = Image.alpha_composite(canvas, pf)

    photo = trim_white(Image.open(photo_path).convert("RGBA"))
    avail_w = plate_box[2] - plate_box[0] - 14
    avail_h = plate_box[3] - plate_box[1] - 14
    ratio = min(avail_w / photo.width, avail_h / photo.height)
    photo = photo.resize((max(1, int(photo.width * ratio)), max(1, int(photo.height * ratio))), Image.LANCZOS)
    canvas.alpha_composite(
        photo,
        (
            plate_box[0] + (plate_box[2] - plate_box[0] - photo.width) // 2,
            plate_box[1] + (plate_box[3] - plate_box[1] - photo.height) // 2,
        ),
    )

    canvas.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def build_article_banner(src_path, out_path, size, label="مقالات"):
    """بانر تحريري بهوية دهبية (v2) لصور المقالات (16:9 أو 1200×630).

    الحواف دهبية زي بلاطة المنتج: خلفية ذهبية فاتحة، إطار دهبي غامق، شريط
    علوي باللوجو، وشريحة «مقالات» زمردية كلمسة تمييز واحدة. رسم المقال
    الأصلي يبقى كما هو داخل نافذة بيضاء مستديرة — مفيش تلوين للفن نفسه.
    """
    W2, H2 = size
    unit = W2 / 1280  # مقياس العناصر على عرض 1280
    pad = int(16 * unit)

    canvas = vgrad((W2, H2), GOLD_PALE, GOLD_PALE_DEEP).convert("RGBA")
    deco = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for x in range(-H2, W2, int(46 * unit)):
        dd.line([(x, 0), (x + H2, H2)], fill=(255, 255, 255, 10), width=int(10 * unit))
    dd.ellipse([-int(140 * unit), -int(180 * unit), int(380 * unit), int(340 * unit)], fill=(255, 255, 255, 26))
    dd.ellipse([W2 - int(320 * unit), H2 - int(220 * unit), W2 + int(120 * unit), H2 + int(220 * unit)],
               outline=GOLD_MID + (90,), width=int(7 * unit))
    canvas = Image.alpha_composite(canvas, deco)

    # الإطار: خط دهبي غامق على الحافة + خط أبيض رفيع جوّاه
    frame = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle([pad, pad, W2 - pad, H2 - pad], radius=int(26 * unit),
                         outline=GOLD_DEEP + (210,), width=max(3, int(5 * unit)))
    fd.rounded_rectangle([pad + int(14 * unit), pad + int(14 * unit), W2 - pad - int(14 * unit),
                          H2 - pad - int(14 * unit)], radius=int(18 * unit),
                         outline=(255, 255, 255, 130), width=1)
    canvas = Image.alpha_composite(canvas, frame)

    # الشريط العلوي: لوجو + اسم العلامة + شريحة «مقالات»
    logo_size = int(46 * unit)
    logo = Image.open(LOGO).convert("RGBA").resize((logo_size, logo_size), Image.LANCZOS)
    canvas.alpha_composite(logo, (pad + int(26 * unit), pad + int(22 * unit)))
    d = ImageDraw.Draw(canvas)
    bf = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-900.ttf"), int(26 * unit))
    d.text((pad + int(26 * unit) + logo_size + int(14 * unit), pad + int(22 * unit) + logo_size // 2),
           "الإخلاص ميديكال", font=bf, fill=GOLD_DEEP, anchor="lm",
           direction="rtl", language="ar")

    chip_font = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-700.ttf"), int(26 * unit))
    tw = d.textlength(label, font=chip_font)
    chip = [W2 - pad - int(26 * unit) - (tw + int(52 * unit)), pad + int(22 * unit),
            W2 - pad - int(26 * unit), pad + int(22 * unit) + int(50 * unit)]
    chip_layer = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    ImageDraw.Draw(chip_layer).rounded_rectangle(chip, radius=int(25 * unit), fill=EMERALD + (255,))
    canvas = Image.alpha_composite(canvas, chip_layer)
    d = ImageDraw.Draw(canvas)
    d.text(((chip[0] + chip[2]) // 2, (chip[1] + chip[3]) // 2), label, font=chip_font,
           fill=(255, 250, 235), anchor="mm", direction="rtl", language="ar")

    # نافذة الرسم: من تحت الشريط العلوي إلى قرب الحافة السفلية
    box = [pad + int(26 * unit), pad + int(92 * unit), W2 - pad - int(26 * unit), H2 - pad - int(40 * unit)]
    bw, bh = box[2] - box[0], box[3] - box[1]
    base = Image.open(src_path).convert("RGBA")
    scale = max(bw / base.width, bh / base.height)
    base = base.resize((max(bw, int(base.width * scale)), max(bh, int(base.height * scale))), Image.LANCZOS)
    left = (base.width - bw) // 2
    top = (base.height - bh) // 2
    art = base.crop((left, top, left + bw, top + bh))

    shadow = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([box[0], box[1] + int(8 * unit), box[2], box[3] + int(10 * unit)],
                                             radius=int(20 * unit), fill=(0, 0, 0, 70))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(int(10 * unit))))
    holder = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    holder.paste(art, (0, 0), rmask((bw, bh), int(20 * unit)))
    canvas.alpha_composite(holder, (box[0], box[1]))
    pf = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    ImageDraw.Draw(pf).rounded_rectangle(box, radius=int(20 * unit), outline=(255, 255, 255, 170), width=2)
    canvas = Image.alpha_composite(canvas, pf)

    # موقع المتجر أسفل يمين (يفيد عند المشاركة على واتساب/سوشيال)
    d = ImageDraw.Draw(canvas)
    dom_font = ImageFont.truetype(os.path.join(FONT_DIR, "cairo-700.ttf"), int(22 * unit))
    d.text((W2 - pad - int(26 * unit), H2 - pad - int(14 * unit)), "alikhlasmedical.store",
           font=dom_font, fill=GOLD_DEEP + (235,), anchor="rd", direction="ltr", language="en")

    canvas.convert("RGB").save(out_path, "PNG")
    return out_path


def article_banners(article_dir, out_dir, og_dir, slugs):
    made = []
    for slug in slugs:
        src = os.path.join(article_dir, f"article-{slug}.webp")
        if not os.path.exists(src):
            print(f"⚠️  missing article image: {src}", file=sys.stderr)
            continue
        hero = os.path.join(out_dir, f"article-{slug}-brand.webp")
        build_article_banner(src, "/tmp/_hero.png", (1280, 720))
        Image.open("/tmp/_hero.png").convert("RGB").save(hero, "WEBP", quality=82, method=6)
        og = os.path.join(og_dir, f"{slug}.webp")
        build_article_banner(src, "/tmp/_og.png", (1200, 630))
        Image.open("/tmp/_og.png").convert("RGB").save(og, "WEBP", quality=82, method=6)
        made.append((hero, og))
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog")
    ap.add_argument("out_dir")
    ap.add_argument("--style", default="brand", choices=["brand", "light", "dark", "both", "legacy-both"])
    ap.add_argument("--ids", default="")
    args = ap.parse_args()

    items = json.load(open(args.catalog, encoding="utf-8"))
    if args.ids:
        wanted = {i.strip() for i in args.ids.split(",") if i.strip()}
        items = [i for i in items if i["id"] in wanted]
    if args.style == "brand":
        styles = ["brand"]
    elif args.style == "both":
        styles = ["light", "dark"]
    elif args.style == "legacy-both":
        styles = ["brand", "light"]
    else:
        styles = [args.style]
    os.makedirs(args.out_dir, exist_ok=True)

    made = 0
    for item in items:
        src = os.path.join(ROOT, "public", item["image"].lstrip("/"))
        if not os.path.exists(src):
            print(f"⚠️  missing image for {item['id']}: {item['image']}", file=sys.stderr)
            continue
        for style in styles:
            out = os.path.join(args.out_dir, f"{item['slug']}-{style}.png")
            if style == "brand":
                build_brand(src, item["name"], item["category"], out)
            else:
                build(src, item["name"], item["category"], out, style)
            made += 1
    print(f"✓ {made} image(s) → {args.out_dir}")


if __name__ == "__main__":
    main()
