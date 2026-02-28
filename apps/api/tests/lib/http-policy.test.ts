import { afterEach, describe, expect, it, vi } from "vitest";
import { resilientFetch } from "../../src/lib/http-client.js";
import { filterArticlesByRelevance } from "../../src/lib/ai-relevance-filter.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http policy", () => {
  it("retries on 429 then succeeds", async () => {
    const responses = [
      new Response("", { status: 429 }),
      new Response("", { status: 429 }),
      new Response("ok", { status: 200 }),
    ];
    const fetchMock = vi.fn(() => Promise.resolve(responses.shift()!));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const res = await resilientFetch("https://example.test", {
      apiName: "pubmed",
      retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 },
      skipRateLimit: true,
      skipCircuitBreaker: true,
      timeoutMs: 500,
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("ai relevance fail-safe", () => {
  it("keeps all articles on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("boom"))) as unknown as typeof fetch,
    );

    const result = await filterArticlesByRelevance({
      articles: [{ title: "a", abstract: "b" }],
      query: "q",
      apiKey: "fake",
      mode: "score",
    });

    expect(result.relevant).toHaveLength(1);
    expect(result.failed).toBe(true);
  });
});
