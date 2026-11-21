import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { products, searchAllPublicProducts } from "@/data/products";
import { suggestProductSearch } from "@/lib/product-search";
import { trackSiteSearch, trackViewItemList, trackSelectItem } from "@/lib/analytics";
import { useCheckoutFunnel } from "@/hooks/use-checkout-funnel";
import { submitToGoogleSheets } from "@/lib/governorates";

type Event = { event: string; [key: string]: unknown };
const w = window as unknown as { dataLayer: Event[]; gtag?: unknown };

/**
 * الأحداث تُدفع بصيغة أوامر gtag ["event", name, params] (الصيغة الوحيدة التي
 * يُرسلها gtag.js فعلًا). هذا المُطبِّع يرجعها في صورة { event, ...params }.
 */
function events(): Event[] {
  return (w.dataLayer as unknown as unknown[]).map((entry) => {
    const args = entry as unknown[];
    if (
      Array.isArray(entry) ||
      (typeof entry === "object" && entry !== null && "length" in (entry as object))
    ) {
      return {
        event: String(args[1] ?? ""),
        ...((args[2] as Record<string, unknown>) ?? {}),
      } as Event;
    }
    return entry as Event;
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete w.gtag;
  w.dataLayer = [];
});

describe("ranked Egyptian product search", () => {
  it.each(["كريفا", "سعر كريفا", "كريفا سعر", "شراء كريفا"])("finds Kreva for %s", (query) => {
    expect(searchAllPublicProducts(query).map((p) => p.id)).toEqual(["m-60"]);
  });
  it("matches joined names without changing product names", () => {
    expect(searchAllPublicProducts("بينكشوت").map((p) => p.id)).toEqual(["w-25"]);
  });
  it.each(["مضخة كهربائية", "مضخه كهربائيه", "مُضخّة كهربائيّة"])("normalizes %s", (q) => {
    expect(searchAllPublicProducts(q).map((p) => p.id)).toEqual(["d-07", "d-08"]);
  });
  it("requires both the synonym and brand, not a generic alias alone", () => {
    expect(searchAllPublicProducts("نقط كونيبال").map((p) => p.id)).toEqual(["w-15"]);
  });
  it("offers explicit spelling suggestions without silently substituting results", () => {
    expect(searchAllPublicProducts("كريفو")).toEqual([]);
    expect(suggestProductSearch(products, "كريفو").map((p) => p.id)).toContain("m-60");
    expect(suggestProductSearch(products, "zzzzzzzz")).toEqual([]);
  });
});

describe("privacy and checkout measurement", () => {
  it("redacts search input and prevents legacy list names from carrying it", () => {
    w.dataLayer = [];
    delete w.gtag;
    const query = "نقط كونيبال 01012345678";
    const item = { id: "w-15", name: "Test", price: 100, qty: 1 };
    trackSiteSearch(query, 1);
    trackViewItemList(`search_${query}`, [item]);
    trackSelectItem(`men_search_${query}`, item);
    expect(JSON.stringify(events())).not.toContain("01012345678");
    expect(events()[1].item_list_name).toBe("search_results");
    expect(events()[2].item_list_name).toBe("men_search_results");
  });
  it("starts checkout on editing, not only on submit, and deduplicates a session", () => {
    w.dataLayer = [];
    delete w.gtag;
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useCheckoutFunnel(
          "quick_order",
          [{ id: "a", name: "A", price: 100, qty: 1 }],
          150,
          50,
          enabled,
        ),
      { initialProps: { enabled: false } },
    );
    expect(events()).toEqual([]);
    rerender({ enabled: true });
    expect(events().map((e) => e.event)).toEqual(["checkout_open"]);
    act(() => {
      result.current.start();
      result.current.start();
      result.current.submit();
      result.current.submit();
    });
    expect(events().filter((e) => e.event === "begin_checkout")).toHaveLength(1);
    expect(events().filter((e) => e.event === "checkout_submit")).toHaveLength(2);
    expect(events().find((e) => e.event === "begin_checkout")?.value).toBe(100);
    rerender({ enabled: false });
    rerender({ enabled: true });
    act(() => result.current.start());
    expect(events().filter((e) => e.event === "begin_checkout")).toHaveLength(2);
  });
  it.each([true, false])("records safe request outcome (success=%s)", async (success) => {
    w.dataLayer = [];
    delete w.gtag;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success }), { status: 200 })),
    );
    await submitToGoogleSheets({ customerName: "Private Test", customerPhone: "01012345678" });
    const event = events().find((e) => e.event === "order_request");
    expect(event?.request_outcome).toBe(success ? "success" : "rejected");
    expect(Number(event?.duration_ms)).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(events())).not.toMatch(/Private Test|01012345678/);
  });
});
