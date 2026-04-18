import { BTX_BODY_ROWS, BTX_COLUMNS } from "@/lib/btx/constants";
import { fitToColumns, toRoute } from "@/lib/btx/helpers";
import { NOT_FOUND_PAGE } from "@/lib/btx/not-found-page";
import { getRenderedPage, getRenderedPages } from "@/lib/btx/page-registry";
import type { BtxBodyLine, BtxRenderedPage } from "@/lib/btx/types";
import { SITE_URL } from "@/lib/site-config";

const HOMEPAGE_LINKS = [
  '</001>; rel="help"; title="BTX Bedienhinweise"',
  '</820>; rel="contents"; title="BTX Seitenuebersicht"',
  '</>; rel="alternate"; type="text/markdown"; title="BTX Markdown Ansicht"',
  '</sitemap.xml>; rel="describedby"; type="application/xml"; title="XML Sitemap"',
];

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function resolvePageFromPathname(pathname: string): BtxRenderedPage | undefined {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/") {
    return getRenderedPage({ page: "000" });
  }

  if (normalizedPath === "/404") {
    return NOT_FOUND_PAGE;
  }

  const match = normalizedPath.match(/^\/(?<page>\d{3})(?:\/(?<subpage>\d+))?$/);

  if (!match?.groups?.page) {
    return undefined;
  }

  const page = match.groups.page as `${number}${number}${number}`;
  const subpage = match.groups.subpage ? Number(match.groups.subpage) : 1;
  return getRenderedPage({ page, subpage });
}

function renderPageNavLine(line: Extract<BtxBodyLine, { kind: "page-nav" }>): string {
  const left = line.prevLabel ?? "";
  const right = line.nextLabel ?? "";

  if (!left && !right) {
    return " ".repeat(BTX_COLUMNS);
  }

  if (!left) {
    return `${" ".repeat(Math.max(0, BTX_COLUMNS - right.length))}${right}`;
  }

  if (!right) {
    return fitToColumns(left);
  }

  const gap = Math.max(1, BTX_COLUMNS - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`.slice(0, BTX_COLUMNS);
}

function renderBodyLine(line: BtxBodyLine): string {
  switch (line.kind) {
    case "blank":
      return " ".repeat(BTX_COLUMNS);
    case "text":
    case "link":
    case "search":
      return fitToColumns(line.text);
    case "search-result":
      return fitToColumns(line.slot === 0 ? "STICHWORT EINGEBEN" : "");
    case "page-nav":
      return renderPageNavLine(line);
  }
}

function renderScreenLines(page: BtxRenderedPage): string[] {
  const bodyLines = [...page.bodyLines];

  while (bodyLines.length < BTX_BODY_ROWS) {
    bodyLines.push({ kind: "blank" });
  }

  return [
    ...page.headerLines.map((line) => fitToColumns(line)),
    ...bodyLines.slice(0, BTX_BODY_ROWS).map(renderBodyLine),
    fitToColumns(page.statusHint),
  ];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function getCanonicalPathname(pathname: string): string | undefined {
  const page = resolvePageFromPathname(pathname);

  if (!page) {
    return undefined;
  }

  if (page.id === "000" && page.subpage === 1) {
    return "/";
  }

  return page.route;
}

export function getCanonicalPageUrls(): string[] {
  return [
    new URL("/", SITE_URL).href,
    ...getRenderedPages()
      .filter((page) => !(page.id === "000" && page.subpage === 1))
      .map((page) => new URL(page.route, SITE_URL).href),
  ];
}

export function buildSitemapXml(): string {
  const urls = getCanonicalPageUrls()
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', urls, "</urlset>"].join(
    "\n",
  );
}

export function buildRobotsTxt(): string {
  return [
    "# BTX Blue crawl policy",
    "User-agent: *",
    "Content-signal: search=yes, ai-train=yes, ai-input=yes",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: Claude-Web",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "Sitemap: https://btx.blue/sitemap.xml",
  ].join("\n");
}

export function renderMarkdownDocument(pathname: string): string {
  const page = resolvePageFromPathname(pathname) ?? NOT_FOUND_PAGE;
  const currentRoute = page.id === "000" && page.subpage === 1 ? "/" : toRoute(page.id, page.subpage);
  const pageLabel = page.subpage > 1 ? `${page.id}/${page.subpage}` : page.id;

  return [
    `# BTX Blue ${pageLabel}`,
    "",
    "```text",
    ...renderScreenLines(page),
    "```",
    "",
    "## Weitere Seiten",
    "",
    `Diese Antwort zeigt genau eine BTX-Seite fuer \`${currentRoute}\` in terminalfreundlicher Form.`,
    "Weitere Inhalte erreichst du direkt ueber dreistellige Seitenpfade wie `/100`, `/200`, `/510` oder `/998/2`.",
    "Nutze `/820` fuer die Seitenuebersicht und `/800` fuer den Seitenfinder.",
    "Browser bekommen hier weiter HTML. Agents koennen dieselbe URL mit `Accept: text/markdown` abrufen.",
  ].join("\n");
}

export function getHomepageLinkHeaderValue(): string {
  return HOMEPAGE_LINKS.join(", ");
}

export function isHomepagePath(pathname: string): boolean {
  const normalizedPath = normalizePathname(pathname);
  return normalizedPath === "/" || normalizedPath === "/000";
}

export function isKnownBtxPath(pathname: string): boolean {
  return Boolean(resolvePageFromPathname(pathname));
}

export function getMarkdownStatus(pathname: string): number {
  return resolvePageFromPathname(pathname) ? 200 : 404;
}

export function estimateMarkdownTokens(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.length / 4));
}

interface AcceptPreference {
  index: number;
  q: number;
  specificity: number;
}

function parseAcceptPreference(acceptHeader: string, mediaType: string): AcceptPreference | null {
  let best: AcceptPreference | null = null;
  const [mediaTypePrefix] = mediaType.split("/");

  for (const [index, rawEntry] of acceptHeader.split(",").entries()) {
    const [rawType, ...rawParams] = rawEntry.split(";");
    const type = rawType.trim().toLowerCase();

    if (!type) {
      continue;
    }

    let specificity = -1;

    if (type === mediaType) {
      specificity = 2;
    } else if (type === `${mediaTypePrefix}/*`) {
      specificity = 1;
    } else if (type === "*/*") {
      specificity = 0;
    }

    if (specificity < 0) {
      continue;
    }

    let q = 1;

    for (const rawParam of rawParams) {
      const [name, value] = rawParam.split("=");

      if (name?.trim().toLowerCase() !== "q") {
        continue;
      }

      const parsed = Number(value?.trim());

      if (!Number.isNaN(parsed)) {
        q = Math.min(1, Math.max(0, parsed));
      }
    }

    if (
      !best ||
      specificity > best.specificity ||
      (specificity === best.specificity && index < best.index)
    ) {
      best = { index, q, specificity };
    }
  }

  return best;
}

export function acceptsMarkdown(acceptHeader: string | null): boolean {
  if (!acceptHeader) {
    return false;
  }

  const markdown = parseAcceptPreference(acceptHeader, "text/markdown");

  if (!markdown || markdown.q <= 0) {
    return false;
  }

  const html = parseAcceptPreference(acceptHeader, "text/html");

  if (!html || html.q <= 0) {
    return markdown.specificity === 2;
  }

  if (markdown.q > html.q) {
    return true;
  }

  if (markdown.q < html.q) {
    return false;
  }

  if (markdown.specificity !== html.specificity) {
    return markdown.specificity > html.specificity;
  }

  return false;
}

export function buildMarkdownResponse(pathname: string): Response {
  const markdown = renderMarkdownDocument(pathname);

  return new Response(markdown, {
    status: getMarkdownStatus(pathname),
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
      vary: "Accept",
    },
  });
}

export function withAgentDiscoveryHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");

  if (!vary) {
    headers.set("Vary", "Accept");
  } else if (!vary.toLowerCase().split(",").map((entry) => entry.trim()).includes("accept")) {
    headers.set("Vary", `${vary}, Accept`);
  }

  if (isHomepagePath(pathname)) {
    headers.set("Link", getHomepageLinkHeaderValue());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
