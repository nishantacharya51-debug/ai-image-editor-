import { afterEach, describe, expect, it, vi } from "vitest";
import { askAI } from "./ai";
afterEach(() => vi.unstubAllGlobals());
describe("AI response boundaries", () => {
  it("rejects malformed JSON, even with a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
    );
    await expect(
      askAI("data:image/jpeg;base64,abc", "warm", "prompt"),
    ).rejects.toThrow("invalid JSON");
  });
  it("rejects schema-invalid and empty outputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    await expect(
      askAI("data:image/jpeg;base64,abc", "warm", "prompt"),
    ).rejects.toThrow("invalid structured data");
  });
  it("surfaces a rate limit without retries", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Quota reached" }), {
        status: 429,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(askAI("a", "warm", "prompt")).rejects.toThrow("Quota reached");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("clamps valid suggestions, drops unrelated settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            explanation: "Warm light",
            adjustments: { temperature: 500, exposure: -8, unsupported: 10 },
          }),
          { status: 200 },
        ),
      ),
    );
    expect((await askAI("a", "warm", "prompt")).adjustments).toEqual({
      temperature: 100,
      exposure: -2,
    });
  });
});
