import { readFileSync } from "node:fs";
import type { BtxBodyLine, BtxRenderedPage } from "@/lib/btx/types";
import { searchIndex } from "@/lib/btx/search";
import { SITE_URL } from "@/lib/site-config";

const templates = Object.fromEntries(
  ["document", "terminal", "screen", "status"].map((name) => [name, readFileSync(`src/templates/${name}.html`, "utf8")]),
);

function fill(name: string, values: Record<string, string>): string {
  return templates[name].replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Missing ${name} template value: ${key}`);
    return values[key];
  });
}

function escape(value: string | number): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function bodyLine(line: BtxBodyLine): string {
  switch (line.kind) {
    case "blank":
      return '<div class="btx-line" aria-hidden="true">&nbsp;</div>';
    case "link":
      return `<a class="btx-line btx-line--link btx-line--${line.tone ?? "success"}" href="${escape(line.route)}" aria-label="${escape(line.ariaLabel ?? line.text)}" data-btx-noise-text="${escape(line.text)}">${escape(line.text)}</a>`;
    case "search":
      return `<label class="btx-line btx-line--search" for="btx-search-input"><span class="btx-search-label" data-btx-noise-text="${escape(line.text)}">${escape(line.text)}</span><input id="btx-search-input" class="btx-search-input" type="search" maxlength="24" autocomplete="off" spellcheck="false" placeholder="${escape(line.placeholder)}" aria-label="Suche im Seitenfinder" data-btx-search-input /></label>`;
    case "search-result":
      return `<a class="btx-line btx-line--link btx-line--success btx-search-result" href="/800" data-btx-search-result="${line.slot}" data-btx-noise-text="${line.slot === 0 ? "STICHWORT EINGEBEN" : "\u00a0"}" aria-label="Suchtreffer ${line.slot + 1}">STICHWORT EINGEBEN</a>`;
    case "page-nav": {
      const previous = line.prevRoute
        ? `<a class="btx-page-nav-link btx-page-nav-link--left" href="${escape(line.prevRoute)}" aria-label="Vorherige Folgeseite"><span data-btx-noise-text="${escape(line.prevLabel ?? "")}">${escape(line.prevLabel ?? "")}</span></a>`
        : '<span class="btx-page-nav-empty">&nbsp;</span>';
      const next = line.nextRoute
        ? `<a class="btx-page-nav-link btx-page-nav-link--right" href="${escape(line.nextRoute)}" aria-label="Naechste Folgeseite"><span data-btx-noise-text="${escape(line.nextLabel ?? "")}">${escape(line.nextLabel ?? "")}</span></a>`
        : '<span class="btx-page-nav-empty">&nbsp;</span>';
      return `<div class="btx-line btx-line--page-nav">${previous}${next}</div>`;
    }
    case "text":
      return `<div class="btx-line btx-line--${line.tone ?? "default"}" data-btx-noise-text="${escape(line.text || "\u00a0")}">${escape(line.text || "\u00a0")}</div>`;
  }
}

export interface Assets {
  client: string;
  css: string;
}

export function renderDocument(page: BtxRenderedPage, assets: Assets, home = false): string {
  const label = page.subpage > 1 ? `${page.id}/${page.subpage}` : page.id;
  const screen = fill("screen", {
    speeds: ["LINE", 300, 1200, 2400, 9600].map((speed) => `<label class="btx-baud-option"><input class="btx-baud-option__input" type="radio" name="btx-baud" value="${speed}"${speed === 1200 ? " checked" : ""} data-btx-baud-option /><span class="btx-baud-option__label">${speed === "LINE" ? "Direkt" : speed === 1200 ? "1200 / 75 · BTX" : speed}</span></label>`).join(""),
    headers: page.headerLines.map((line, index) => `<div class="btx-line ${index === 1 ? "btx-line--dim" : "btx-line--accent"}" data-btx-noise-text="${escape(line)}">${escape(line)}</div>`).join(""),
    body: page.bodyLines.map(bodyLine).join(""),
    status: fill("status", { page: escape(label) }),
    search: page.id === "800" ? `<script type="application/json" id="btx-search-index">${JSON.stringify(searchIndex).replaceAll("<", "\\u003c")}</script>` : "",
  });
  return fill("document", {
    title: escape(`BTX Blue ${label}`),
    description: escape(page.id === "404" ? "BTX Fehlerseite 404" : home ? "BTX Startseite fuer Uwe Schwarz auf btx.blue" : page.subpage > 1 ? `${page.title} Folgeseite ${page.subpage}` : `${page.title} auf BTX Blue`),
    robots: page.id === "404" ? "noindex,nofollow" : "index,follow",
    canonical: escape(new URL(page.id === "000" && page.subpage === 1 ? "/" : page.route, SITE_URL).href),
    image: escape(new URL("/og-image.png", SITE_URL).href),
    terminal: fill("terminal", { screen }),
    client: escape(assets.client),
    css: escape(assets.css),
  });
}
