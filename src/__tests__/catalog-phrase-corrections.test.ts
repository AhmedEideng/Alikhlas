import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
const byId = (id: string) => products.find((p) => p.id === id)!;
describe("phrase-only catalog corrections", () => {
  it("preserves every non-copy catalog field, including names, prices, badges and bundles", () => {
    expect(products).toHaveLength(85);
    // Power 36 وBig Penis بقيا متساويين (230 جنيهاً)، والتحقق بقى مربوطاً
    // بالسعر الفعلي حتى لا يصبح الاختبار مصدر حقيقة موازياً.
    for (const id of ["m-38", "m-46"]) {
      expect(byId(id).price).toBe(230);
      expect(byId(id).price).toBe(byId(id === "m-38" ? "m-46" : "m-38").price);
      expect(getProductFAQs(byId(id)).some((faq) => faq.answer.includes("230 جنيه"))).toBe(true);
    }
    const copyFields = new Set(["description", "benefits", "ingredients", "usage"]);
    const fields = products.map((p) =>
      Object.fromEntries(
        Object.entries(p)
          .filter(([k]) => !copyFields.has(k))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      ),
    );
    // اسم واحد فقط تغيّر — m-06 «جل TREAND للرجال» → «جل تريند للتأخير للرجال
    // في SERP). لا سعر/شارة/تصنيف/bundle تغيّر في هذه الجولة.
    // stock=1 وخارج سياسة «المتوفر دائمًا» → 5000. كل الأسماء/الأسعار/الشارات
    // وbundle كما هي، وهذا مؤكد بالبصمة الثانية أسفل الاختبار.
    // إكس ستيل» (اسم + ألقاب بحث)، فالبصمة اتغيّرت في حقلين غير نصيين فقط.
    // (كريڨا/كريڨه/جل كريفا/جل تأخير/Kreva Gel) لتوحيده مع باقي الكتالوج.
    // عنصرين للقائمة، بلا أي تغيير في أسعار/أسماء/شارات/bundles الباقين.
    // العشبي» (اسم + ألقاب بحث). السعر 400 والـslug والصور كما هي.
    // الاسم: «— 12 كيس × 16 جم» + ألقاب بحث للحجم. السعر/الـslug/الصورة ثابتة.
    // صارت نفس شارة بطاقة المنتج (انتصاب وتأخير / انتصاب / رغبة وإثارة)، فلا
    // يختلف الكارت عن صفحة المنتج.
    // ستة منتجات من الكتالوج وخُفِّضت أسعار الباقي (20 جنيهاً للرجال والنساء،
    // 50 جنيهاً للأجهزة). لا اسم آخر ولا شارة ولا تصنيف ولا bundle تغيّر.
    // صياغة أسماء المنتجات الـ85 بنمط تسويقي (كلمة بحث + العلامة + الحجم) بدل
    // النسخ الحرفي من كتالوج المتاجر المتشابهة، وأُطيلت الأوصاف بجملة تحفيزية
    // تحمل مفردات بحث حقيقية (تأخير القذف / تقوية الرجال / عسل ملكي / قطرات
    // نسائية) — بلا ادعاء علاجي وبلا جُمل الإحالة المحظورة. الأسعار والـslugs
    // والشارات والتصنيفات والـbundles **لم تتغيّر**. لذلك يتغيّر البصم **مرة
    // واحدة عن قصد** (name + searchAliases فقط).
    // واحدة**: أُعيد ترتيب بنية أسماء المنتجات الـ85 (بدل قالب واحد متكرر
    // «[الشكل] [العلامة] [الفائدة] للرجال — [الحجم]») إلى خمسة قوالب متبادلة:
    // العلامة أولًا في المنتجات ذات العلامة المعروفة (بروكوميل، كريفا، سياليس،
    // فياجرا، تيتان)، والفائدة أولًا في المنتجات ذات البحث الطويل، والحجم/العدد
    // داخل الاسم بدل الذيل، و«للرجال/للنساء» أو الصفة («رجالي/نسائي») أو حذف
    // علامة الجنس حين تكون الكلمة المفتاحية كافية. الهدف: تقليل النص المتكرر
    // بين 85 صفحة (تكرار العنوان على جوجل) مع الحفاظ على كلمة البحث والشكل
    // والعلامة في كل اسم. الأسعار والـslugs والشارات والتصنيفات والـbundles
    // **لم تتغيّر** (وبصمة الـbundles في women-gum-copy.test.ts بقيت كما هي).
    // إلى كل اسم من الأسماء الـ85 وصف فخامة واحد (وليس قالبًا موحّدًا) موزّعًا
    // على عائلة كلمات متكافئة: «فاخر/الفاخر» 24، «الملكي/الملكية» 19، «الأصلي»
    // 11، «بريميوم» 7، «احترافي» 5 (الأجهزة)، «المتطور/المطوّرة/المتقدمة» 6،
    // «المركّز» 2، «حريري» 2، «الذهبي» 3، «الاستثنائي» 6، «إصدار خاص» 4،
    // «نخبة» 2، «راقٍ» 2، إضافة إلى الأصل الجغرافي الموثّق (ألماني/هندي/روسي/
    // إيطالي/كوري/أمريكي/أسترالي/تركي) حيث ينطبق. لا ادعاء علاجي ولا كلمة من
    // قائمة المحظور، والأسعار والـslugs والشارات والتصنيفات والـbundles كما هي.
    // لكل منتج من عشرة منتجات: `image` صار يشير إلى نسخة مركّبة بهوية المتجر
    // سعر ولا شارة ولا slug ولا bundle تغيّر — البصمة اتغيّرت لأن مسارات
    // الصور داخلة في الحقول غير النصية، وهذا هو الفرق الوحيد.
    // بصمة الحقول غير النصية (الاسم، الشارات، التصنيفات، الأسعار، الروابط، الصور).
    // تتغيّر فقط عند تغيير مقصود في البيانات، وتُحدَّث معه في نفس الالتزام.
    expect(createHash("sha256").update(JSON.stringify(fields)).digest("hex")).toBe(
      "ceb236e2c297b3517adc67b7f587ae0bbe5b4e1fd2a721188330c616abf5038d",
    );
  });
  it("corrects discrete ingredient and language errors without removing the original descriptions", () => {
    // والفحص بقى على المضمون: المكونات نفسها باقية في الوصف.
    expect(byId("m-32").description).toContain("حمض الهيالورونيك");
    expect(byId("m-32").description).not.toContain("0 أعراض");
    expect(byId("m-60").description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول");
    // التجميلي» — الفحص على كونه موضعيًا بلا تدخل جراحي.
    expect(byId("w-20").description).toContain("كريم تجميلي موضعي");
    expect(byId("w-20").description).toContain("دون أي تدخل جراحي");
    expect(byId("w-20").description).not.toContain("5-7.5%");
    expect(byId("w-14").description).not.toContain("البابايا");
    for (const id of ["w-06", "w-10", "w-11", "w-13"]) expect(byId(id).usage).toContain("امضغي");
    expect(byId("w-22").description).not.toContain("الـ الـ");
  });
  it("retains contraindications and consent while avoiding a dose for an unspecified strength", () => {
    expect(byId("w-17").usage).not.toContain("نصف قرص");
    expect(byId("w-17").usage).toContain("معرفة تركيز القرص");
    expect(getProductFAQs(byId("w-17"))[1].answer).not.toContain("نصف قرص");
    for (const id of ["m-34", "m-38", "m-64", "w-17"])
      expect(byId(id).usage).toMatch(/النترات|النيترات/);
    for (const id of ["w-25", "w-26"]) expect(byId(id).usage).toMatch(/موافقة/);
    // اتشالت من كل المنتجات والأسئلة — الحارس انعكس ليمنع رجوعها.
    expect(byId("m-64").usage).not.toContain("4 ساعات");
    expect(byId("w-22").usage).toContain("نصف قرص");
    expect(byId("m-63").usage).toContain("بعد الوجبة الرئيسية");
  });
  it("keeps confirmed copy and removes contradictory usage-count estimates", () => {
    expect(byId("w-26").description).toContain("غيّري الروتين بطريقتك");
    // «الحل الشامل الثلاثي الأبعاد» — وهي عبارة مشتركة حرفيًا مع الموقع
    // على المضمون المؤكَّد لا على العبارة المكررة.
    expect(byId("m-01").description).toContain("خمس خلاصات عشبية");
    expect(byId("w-03").usage).not.toContain("3-5 استخدامات");
    expect(JSON.stringify(getProductFAQs(byId("w-03")))).not.toContain("3-5 استخدامات");
    expect(byId("m-42").usage).not.toContain("1-2 كيس");
    expect(byId("m-42").usage).toContain("كيس واحد");
  });
});
