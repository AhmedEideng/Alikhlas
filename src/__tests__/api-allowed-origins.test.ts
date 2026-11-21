import { describe, expect, it, vi } from "vitest";

/**
 *
 * منها تضيف `SITE_URL` و`VERCEL_URL` وlocalhost، وثلاثة (ga-pageview ·
 * errors · csp-report) تُثبّت النطاقين فقط. النتيجة على أي معاينة Vercel أو
 * staging أو نطاق مخصص: **403** على نقاط القياس وتقارير الأخطاء وCSP — أي أن
 * الـ fallback الذي بُني أصلًا لالتقاط الزيارات المفقودة لا يعمل في البيئات
 * التي تُختبر فيها التغييرات.
 */

const ENV_KEYS = ["SITE_URL", "VERCEL_URL", "VERCEL_ENV", "NODE_ENV"] as const;

function withEnv<T>(env: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => T): T {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  try {
    return run();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function freshGuards() {
  vi.resetModules();
  return import("../../api/lib/request-guards.js");
}

describe("allowedOrigins()", () => {
  it("always allows the canonical apex and www", async () => {
    const { allowedOrigins } = await freshGuards();
    const origins = withEnv({}, () => allowedOrigins());
    expect(origins.has("https://alikhlasmedical.store")).toBe(true);
    expect(origins.has("https://www.alikhlasmedical.store")).toBe(true);
  });

  it("allows SITE_URL (staging / custom domain)", async () => {
    const { allowedOrigins } = await freshGuards();
    const origins = withEnv({ SITE_URL: "https://staging.example.com" }, () => allowedOrigins());
    expect(origins.has("https://staging.example.com")).toBe(true);
  });

  it("allows a Vercel preview deployment, but never in production", async () => {
    const { allowedOrigins } = await freshGuards();
    const preview = withEnv(
      { VERCEL_URL: "ikhlas-git-branch.vercel.app", VERCEL_ENV: "preview" },
      () => allowedOrigins(),
    );
    expect(preview.has("https://ikhlas-git-branch.vercel.app")).toBe(true);

    const production = withEnv(
      { VERCEL_URL: "ikhlas-git-branch.vercel.app", VERCEL_ENV: "production" },
      () => allowedOrigins(),
    );
    expect(production.has("https://ikhlas-git-branch.vercel.app")).toBe(false);
  });

  it("allows localhost only outside production", async () => {
    const { allowedOrigins } = await freshGuards();
    expect(withEnv({ NODE_ENV: "test" }, () => allowedOrigins()).has("http://localhost:8080")).toBe(
      true,
    );
    expect(
      withEnv({ NODE_ENV: "production" }, () => allowedOrigins()).has("http://localhost:8080"),
    ).toBe(false);
  });
});

describe("isAllowedOrigin()", () => {
  type Req = Parameters<Awaited<ReturnType<typeof freshGuards>>["isAllowedOrigin"]>[0];
  const req = (headers: Record<string, string>) => ({ headers }) as unknown as Req;

  it("accepts a same-origin request from a *.vercel.app deployment in production", async () => {
    const { allowedOrigins, isAllowedOrigin } = await freshGuards();
    const preview = req({
      host: "alikhlas-flax.vercel.app",
      origin: "https://alikhlas-flax.vercel.app",
      "sec-fetch-site": "same-origin",
    });
    expect(
      withEnv({ VERCEL_ENV: "production", SITE_URL: "https://alikhlasmedical.store" }, () =>
        isAllowedOrigin(preview, allowedOrigins()),
      ),
    ).toBe(true);
  });

  it("keeps rejecting a foreign origin", async () => {
    const { allowedOrigins, isAllowedOrigin } = await freshGuards();
    const foreign = req({
      host: "alikhlas-flax.vercel.app",
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    });
    expect(
      withEnv({ VERCEL_ENV: "production" }, () => isAllowedOrigin(foreign, allowedOrigins())),
    ).toBe(false);
  });

  it("rejects a subtler forgery: subdomain of the deployment host", async () => {
    const { allowedOrigins, isAllowedOrigin } = await freshGuards();
    const fossil = req({
      host: "alikhlas-flax.vercel.app",
      origin: "https://alikhlas-flax.vercel.app.attacker.example",
    });
    expect(
      withEnv({ VERCEL_ENV: "production" }, () => isAllowedOrigin(fossil, allowedOrigins())),
    ).toBe(false);
  });

  it("honours x-forwarded-proto so local http dev matches its own origin", async () => {
    const { allowedOrigins, isAllowedOrigin } = await freshGuards();
    const local = req({
      host: "localhost:8080",
      origin: "http://localhost:8080",
      "x-forwarded-proto": "http",
    });
    expect(isAllowedOrigin(local, allowedOrigins())).toBe(true);
  });

  it("still accepts a header-less same-origin fetch when the host is allowlisted", async () => {
    const { allowedOrigins, isAllowedOrigin } = await freshGuards();
    const bare = req({ host: "alikhlasmedical.store", "sec-fetch-site": "same-origin" });
    expect(withEnv({}, () => isAllowedOrigin(bare, allowedOrigins()))).toBe(true);
  });
});

describe("every endpoint reads the shared list", () => {
  const endpoints = [
    "api/ga-pageview.js",
    "api/errors.js",
    "api/csp-report.js",
    "api/reviews.js",
    "api/submit-order.js",
    "api/submit-review.js",
  ];

  it.each(endpoints)("%s has no hard-coded origin set", async (path) => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "../..", path), "utf-8");
    expect(src).toContain("allowedOrigins");
    expect(src).not.toMatch(/new Set\(\[\s*"https:\/\/alikhlasmedical\.store"/);
  });
});
