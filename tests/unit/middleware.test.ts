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

  it("returns ansi for explicit ANSI requests in astro runtime", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/", {
          headers: {
            accept: "text/x-ansi",
          },
        }),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () => new Response("<html><body>BTX</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("vary")).toContain("User-Agent");
    await expect(response.text()).resolves.toContain("\u001B[");
  });

  it("returns markdown for unknown upstream html 404 responses", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/sdfasdfsad-whatever", {
          headers: {
            accept: "text/markdown",
          },
        }),
        url: new URL("https://btx.blue/sdfasdfsad-whatever"),
      } as never,
      vi.fn(async () => new Response("<html><body>missing</body></html>", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    await expect(response.text()).resolves.toContain("SEITE NICHT VORHANDEN");
  });

  it("returns ansi for curl wildcard 404 responses", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/sdfasdfsad-whatever", {
          headers: {
            accept: "*/*",
            "user-agent": "curl/8.7.1",
          },
        }),
        url: new URL("https://btx.blue/sdfasdfsad-whatever"),
      } as never,
      vi.fn(async () => new Response("<html><body>missing</body></html>", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body).toContain("\u001B[");
    expect(body).toContain("SEITE NICHT VORHANDEN");
  });

  it("does not replace non-404 upstream html with generated markdown", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/custom-page", {
          headers: {
            accept: "text/markdown",
          },
        }),
        url: new URL("https://btx.blue/custom-page"),
      } as never,
      vi.fn(async () => new Response("<html><body>custom html</body></html>", { status: 200, headers: { "content-type": "Text/HTML; charset=utf-8" } })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("Text/HTML; charset=utf-8");
    await expect(response.text()).resolves.toContain("custom html");
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

  it("preserves existing Link headers when adding homepage discovery links", async () => {
    const response = await handleAstroAgentRequest(
      {
        request: new Request("https://btx.blue/"),
        url: new URL("https://btx.blue/"),
      } as never,
      vi.fn(async () =>
        new Response("<html><body>BTX</body></html>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
            Link: '</upstream>; rel="preload"',
          },
        }),
      ),
    );

    expect(response.headers.get("link")).toContain('</upstream>; rel="preload"');
    expect(response.headers.get("link")).toContain('</001>; rel="help"');
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
