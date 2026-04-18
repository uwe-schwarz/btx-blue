import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site-config";
import {
  buildRobotsTxt,
  buildSitemapXml,
  getCanonicalPageUrls,
  getMarkdownStatus,
  getPreferredAgentFormat,
  isKnownBtxPath,
  renderAnsiDocument,
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
    const sitemapUrl = new URL("/sitemap.xml", SITE_URL).href;

    expect(robots).toContain(`Sitemap: ${sitemapUrl}`);
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

  it("renders an ANSI-colored terminal page with BTX navigation help", () => {
    const ansi = renderAnsiDocument("/");

    expect(ansi).toContain("\u001B[");
    expect(ansi).toContain("BTX.BLUE            UWE SCHWARZ 000");
    expect(ansi).toContain("Weitere Seiten:");
    expect(ansi).toContain("/820");
    expect(ansi).toContain("/800");
  });

  it("rejects explicit subpage-one aliases as known BTX pages", () => {
    expect(isKnownBtxPath("/100/1")).toBe(false);
    expect(isKnownBtxPath("/000/01")).toBe(false);
    expect(getMarkdownStatus("/100/1")).toBe(404);
    expect(renderMarkdownDocument("/100/1")).toContain("SEITE NICHT VORHANDEN");
  });

  it("prefers markdown or ansi only when clearly requested, otherwise keeps html default", () => {
    expect(getPreferredAgentFormat("text/markdown", null)).toBe("markdown");
    expect(getPreferredAgentFormat("text/markdown;q=0.9, text/html;q=0.1", null)).toBe("markdown");
    expect(getPreferredAgentFormat("text/markdown;q=0.9, text/*;q=0.8, */*;q=0.1", null)).toBe("markdown");

    expect(getPreferredAgentFormat("text/x-ansi", null)).toBe("ansi");
    expect(getPreferredAgentFormat("text/ansi;q=0.9, text/html;q=0.1", null)).toBe("ansi");
    expect(getPreferredAgentFormat("text/x-ansi;q=0.9, text/markdown;q=0.8, text/html;q=0.1", null)).toBe("ansi");
    expect(getPreferredAgentFormat("text/markdown;q=0.9, text/x-ansi;q=0.8, text/html;q=0.1", null)).toBe("markdown");

    expect(getPreferredAgentFormat("text/*", null)).toBe("html");
    expect(getPreferredAgentFormat("*/*", null)).toBe("html");
    expect(getPreferredAgentFormat("*/*", "curl/8.7.1")).toBe("ansi");
    expect(getPreferredAgentFormat("text/*, */*;q=0.8", "curl/8.7.1")).toBe("html");
    expect(getPreferredAgentFormat("text/markdown;q=0.5, text/html;q=0.5", null)).toBe("html");
    expect(getPreferredAgentFormat("text/x-ansi;q=0.5, text/html;q=0.5", null)).toBe("html");
    expect(getPreferredAgentFormat("text/markdown;q=0.5, */*;q=0.9", null)).toBe("html");
    expect(getPreferredAgentFormat("text/markdown;q=0, text/html;q=1", null)).toBe("html");
    expect(getPreferredAgentFormat("text/html;q=0, */*;q=1", null)).toBe("html");
    expect(getPreferredAgentFormat("text/html;q=0, text/markdown;q=1, */*;q=0.1", null)).toBe("markdown");
    expect(getPreferredAgentFormat("text/html;q=0.1, text/html;q=1, text/markdown;q=0.9", null)).toBe("html");
    expect(getPreferredAgentFormat("text/markdown;q=0.1, text/markdown;q=1, text/html;q=0.9", null)).toBe("markdown");
    expect(getPreferredAgentFormat("text/html;q=0.1, */*;q=0.2, text/html;q=1, text/markdown;q=0.9", null)).toBe("html");
  });
});
