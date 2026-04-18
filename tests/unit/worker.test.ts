import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "@/worker";

function makeEnv(html = "<html><body>BTX</body></html>") {
  return {
    ASSETS: {
      fetch: vi.fn(async () =>
        new Response(html, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        }),
      ),
    },
  };
}

describe("worker agent surfaces", () => {
  it("returns markdown when agents request text/markdown", async () => {
    const env = makeEnv();
    const response = await handleRequest(
      new Request("https://btx.blue/", {
        headers: {
          accept: "text/markdown",
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get("x-markdown-tokens")).toMatch(/^\d+$/);
    await expect(response.text()).resolves.toContain("# BTX Blue 000");
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("adds discovery Link headers to the homepage HTML response", async () => {
    const env = makeEnv();
    const response = await handleRequest(new Request("https://btx.blue/"), env);
    const link = response.headers.get("link");

    expect(response.status).toBe(200);
    expect(response.headers.get("vary")).toContain("Accept");
    expect(link).toContain('</001>; rel="help"');
    expect(link).toContain('</820>; rel="contents"');
    expect(link).toContain('type="text/markdown"');
    await expect(response.text()).resolves.toContain("BTX");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("returns a markdown 404 page for unknown routes", async () => {
    const env = makeEnv("not found");
    env.ASSETS.fetch = vi.fn(async () =>
      new Response("not found", {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }),
    );

    const response = await handleRequest(
      new Request("https://btx.blue/unbekannt", {
        headers: {
          accept: "text/markdown",
        },
      }),
      env,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    await expect(response.text()).resolves.toContain("SEITE NICHT VORHANDEN");
  });

  it("keeps html as the default for wildcard accept headers", async () => {
    const env = makeEnv();
    const response = await handleRequest(
      new Request("https://btx.blue/", {
        headers: {
          accept: "text/*, */*;q=0.8",
        },
      }),
      env,
    );

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("returns markdown only when markdown wins by q value", async () => {
    const env = makeEnv();
    const response = await handleRequest(
      new Request("https://btx.blue/", {
        headers: {
          accept: "text/markdown;q=0.9, text/html;q=0.1, */*;q=0.01",
        },
      }),
      env,
    );

    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
