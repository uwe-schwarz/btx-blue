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
const AGENT_RESPONSE_VARY = "Accept, User-Agent";
const ANSI_MEDIA_TYPES = ["text/x-ansi", "text/ansi"] as const;
const ANSI = {
  reset: "\u001B[0m",
  screen: "\u001B[44;97m",
  header: "\u001B[44;93;1m",
  status: "\u001B[43;30;1m",
  title: "\u001B[46;30;1m",
  help: "\u001B[36;1m",
  hint: "\u001B[2;37m",
};

export type AgentFormat = "html" | "markdown" | "ansi";

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
  const rawSubpage = match.groups.subpage;

  if (rawSubpage) {
    if (!/^[1-9]\d*$/.test(rawSubpage)) {
      return undefined;
    }

    const parsedSubpage = Number(rawSubpage);

    if (parsedSubpage <= 1) {
      return undefined;
    }

    return getRenderedPage({ page, subpage: parsedSubpage });
  }

  const subpage = 1;
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

function renderAnsiLine(line: string, style: string): string {
  return `${style}${line}${ANSI.reset}`;
}

export function renderAnsiDocument(pathname: string): string {
  const page = resolvePageFromPathname(pathname) ?? NOT_FOUND_PAGE;
  const currentRoute = page.id === "000" && page.subpage === 1 ? "/" : toRoute(page.id, page.subpage);
  const pageLabel = page.subpage > 1 ? `${page.id}/${page.subpage}` : page.id;
  const screenLines = renderScreenLines(page);
  const headerLineCount = page.headerLines.length;
  const statusLineIndex = screenLines.length - 1;

  const renderedScreen = screenLines.map((line, index) => {
    if (index < headerLineCount) {
      return renderAnsiLine(line, ANSI.header);
    }

    if (index === statusLineIndex) {
      return renderAnsiLine(line, ANSI.status);
    }

    return renderAnsiLine(line, ANSI.screen);
  });

  return [
    renderAnsiLine(` BTX BLUE ${pageLabel} `.padEnd(BTX_COLUMNS, " "), ANSI.title),
    ...renderedScreen,
    "",
    `${ANSI.help}Weitere Seiten:${ANSI.reset} ${ANSI.screen}/820${ANSI.reset} Uebersicht  ${ANSI.screen}/800${ANSI.reset} Finder  ${ANSI.screen}/100${ANSI.reset} Einstieg`,
    `${ANSI.hint}Aktuelle Ansicht: ${currentRoute}  |  Fuer Markdown: Accept: text/markdown  |  Fuer ANSI: Accept: text/x-ansi${ANSI.reset}`,
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
      (specificity === best.specificity && q > best.q) ||
      (specificity === best.specificity && q === best.q && index < best.index)
    ) {
      best = { index, q, specificity };
    }
  }

  return best;
}

function getBestAcceptPreference(acceptHeader: string | null, mediaTypes: readonly string[]): AcceptPreference | null {
  if (!acceptHeader) {
    return null;
  }

  let best: AcceptPreference | null = null;

  for (const mediaType of mediaTypes) {
    const candidate = parseAcceptPreference(acceptHeader, mediaType);

    if (
      candidate &&
      (!best ||
        candidate.specificity > best.specificity ||
        (candidate.specificity === best.specificity && candidate.q > best.q) ||
        (candidate.specificity === best.specificity && candidate.q === best.q && candidate.index < best.index))
    ) {
      best = candidate;
    }
  }

  return best;
}

function isPositiveExactPreference(preference: AcceptPreference | null): preference is AcceptPreference {
  return Boolean(preference && preference.specificity === 2 && preference.q > 0);
}

function isGenericCurlAccept(acceptHeader: string | null): boolean {
  if (!acceptHeader) {
    return false;
  }

  let hasWildcard = false;

  for (const rawEntry of acceptHeader.split(",")) {
    const [rawType, ...rawParams] = rawEntry.split(";");
    const type = rawType.trim().toLowerCase();

    if (!type) {
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

    if (q <= 0) {
      continue;
    }

    if (type === "*/*") {
      hasWildcard = true;
      continue;
    }

    return false;
  }

  return hasWildcard;
}

function isCurlUserAgent(userAgent: string | null): boolean {
  return /\bcurl\/[\d.]+/i.test(userAgent ?? "");
}

export function getPreferredAgentFormat(acceptHeader: string | null, userAgent: string | null): AgentFormat {
  const markdown = getBestAcceptPreference(acceptHeader, ["text/markdown"]);
  const ansi = getBestAcceptPreference(acceptHeader, ANSI_MEDIA_TYPES);
  const html = getBestAcceptPreference(acceptHeader, ["text/html"]);
  const htmlQ = html?.q ?? 0;

  if (isPositiveExactPreference(markdown) && markdown.q > htmlQ && (!isPositiveExactPreference(ansi) || markdown.q >= ansi.q)) {
    return "markdown";
  }

  if (isPositiveExactPreference(ansi) && ansi.q > htmlQ && (!isPositiveExactPreference(markdown) || ansi.q > markdown.q)) {
    return "ansi";
  }

  if (isCurlUserAgent(userAgent) && isGenericCurlAccept(acceptHeader)) {
    return "ansi";
  }

  return "html";
}

export function acceptsMarkdown(acceptHeader: string | null): boolean {
  return getPreferredAgentFormat(acceptHeader, null) === "markdown";
}

export function buildMarkdownResponse(pathname: string): Response {
  const markdown = renderMarkdownDocument(pathname);

  return new Response(markdown, {
    status: getMarkdownStatus(pathname),
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
      vary: AGENT_RESPONSE_VARY,
    },
  });
}

export function buildAnsiResponse(pathname: string): Response {
  return new Response(renderAnsiDocument(pathname), {
    status: getMarkdownStatus(pathname),
    headers: {
      "content-type": "text/plain; charset=utf-8",
      vary: AGENT_RESPONSE_VARY,
    },
  });
}

export function withAgentDiscoveryHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");

  if (!vary) {
    headers.set("Vary", AGENT_RESPONSE_VARY);
  } else {
    const nextVary = vary
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!nextVary.some((entry) => entry.toLowerCase() === "accept")) {
      nextVary.push("Accept");
    }

    if (!nextVary.some((entry) => entry.toLowerCase() === "user-agent")) {
      nextVary.push("User-Agent");
    }

    headers.set("Vary", nextVary.join(", "));
  }

  if (isHomepagePath(pathname)) {
    const existingLink = headers.get("Link");
    headers.set("Link", existingLink ? `${existingLink}, ${getHomepageLinkHeaderValue()}` : getHomepageLinkHeaderValue());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
