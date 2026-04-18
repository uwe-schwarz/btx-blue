import { describe, expect, it } from "vitest";
import {
  acceptsMarkdown,
  buildRobotsTxt,
  buildSitemapXml,
  getCanonicalPageUrls,
  renderMarkdownDocument,
} from "@/lib/agent-ready";

describe("agent-ready artifacts", () => {
  it("publishes canonical BTX page URLs without duplicating /000", () => {
    const urls = getCanonicalPageUrls();

    expect(urls).toContain("https://btx.blue/");
    expect(urls).toContain("https://btx.blue/100");
    expect(urls).toContain("https://btx.blue/998/2");
    expect(urls).not.toContain("https://btx.blue/000");
  });

  it("builds a sitemap with canonical URLs", () => {
    const sitemap = buildSitemapXml();

    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("<loc>https://btx.blue/</loc>");
    expect(sitemap).toContain("<loc>https://btx.blue/820</loc>");
    expect(sitemap).not.toContain("<loc>https://btx.blue/000</loc>");
  });

  it("builds robots.txt with sitemap, content signals, and explicit AI bot groups", () => {
    const robots = buildRobotsTxt();

    expect(robots).toContain("Sitemap: https://btx.blue/sitemap.xml");
    expect(robots).toContain("Content-signal: search=yes, ai-train=yes, ai-input=yes");
    expect(robots).toContain("User-agent: GPTBot");
    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("User-agent: Claude-Web");
    expect(robots).toContain("User-agent: Google-Extended");
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Disallow:");
  });

  it("renders a BTX-like markdown page with navigation help", () => {
    const markdown = renderMarkdownDocument("/");

    expect(markdown).toContain("# BTX Blue 000");
    expect(markdown).toContain("```text");
    expect(markdown).toContain("BTX.BLUE            UWE SCHWARZ 000");
    expect(markdown).toContain("HOME 000  ZURUECK  SUCHE 800");
    expect(markdown).toContain("Weitere Seiten");
    expect(markdown).toContain("`/820`");
    expect(markdown).toContain("`/800`");
  });

  it("only prefers markdown when it is explicitly and clearly preferred", () => {
    expect(acceptsMarkdown("text/markdown")).toBe(true);
    expect(acceptsMarkdown("text/markdown;q=0.9, text/html;q=0.1")).toBe(true);
    expect(acceptsMarkdown("text/markdown;q=0.9, text/*;q=0.8, */*;q=0.1")).toBe(true);

    expect(acceptsMarkdown("text/*")).toBe(false);
    expect(acceptsMarkdown("*/*")).toBe(false);
    expect(acceptsMarkdown("text/markdown;q=0.5, text/html;q=0.5")).toBe(false);
    expect(acceptsMarkdown("text/markdown;q=0.5, */*;q=0.9")).toBe(false);
    expect(acceptsMarkdown("text/markdown;q=0, text/html;q=1")).toBe(false);
    expect(acceptsMarkdown("text/html;q=0, */*;q=1")).toBe(false);
    expect(acceptsMarkdown("text/html;q=0, text/markdown;q=1, */*;q=0.1")).toBe(true);
  });
});
