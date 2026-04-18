import { describe, expect, it, vi } from "vitest";
import { handleAstroAgentRequest } from "@/lib/astro-agent-runtime";

describe("astro middleware agent surfaces", () => {
  it("returns markdown for text/markdown requests in astro runtime", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/", {
          headers: {
            accept: "text/markdown",
          },
        }),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () => new Response("<html><body>BTX</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    await expect(response.text()).resolves.toContain("# BTX Blue 000");
  });

  it("adds homepage discovery headers to html responses", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/"),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () => new Response("<html><body>BTX</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get("link")).toContain('</001>; rel="help"');
    expect(response.headers.get("link")).toContain('type="text/markdown"');
  });

  it("keeps html for non-explicit text wildcards", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/", {
          headers: {
            accept: "text/*, */*;q=0.8",
          },
        }),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () => new Response("<html><body>BTX</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  it("keeps html in tie cases where markdown is not clearly preferred", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/", {
          headers: {
            accept: "text/markdown;q=0.1, text/html;q=1",
          },
        }),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () => new Response("<html><body>BTX</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });
});
