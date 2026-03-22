import { paginateLines } from "@/lib/btx/paginate";
import type { BtxBodyLine, BtxPageId, BtxRenderedPage, BtxRoute } from "@/lib/btx/types";
import { buildPageDefinitions } from "@/lib/btx/content-map";
import { shorten, toRoute, toUpperBtx } from "@/lib/btx/helpers";

const pageDefinitions = buildPageDefinitions();

function makeHeaderLines(id: BtxPageId, title: string, subpage: number, totalSubpages: number): [string, string, string] {
  const topLine = `BTX.BLUE            UWE SCHWARZ ${id}`.slice(0, 40);
  const secondLine = "========================================";
  const titleSuffix = totalSubpages > 1 ? ` ${subpage}/${totalSubpages}` : "";
  const thirdLine = toUpperBtx(shorten(`${title}${titleSuffix}`, 40));
  return [topLine, secondLine, thirdLine];
}

function stripLineText(line: BtxBodyLine): string {
  if (line.kind === "text" || line.kind === "link" || line.kind === "search") {
    return line.text;
  }

  return "";
}

const renderedPages: BtxRenderedPage[] = pageDefinitions.flatMap((definition) => {
  const paginated = paginateLines(definition.lines);

  return paginated.map((bodyLines, index) => ({
    id: definition.id,
    title: definition.title,
    keywords: definition.keywords,
    subpage: index + 1,
    route: toRoute(definition.id, index + 1),
    headerLines: makeHeaderLines(definition.id, definition.title, index + 1, paginated.length),
    bodyLines,
    statusHint: "HOME 000  ZURUECK  SUCHE 800",
    prevRoute: index > 0 ? toRoute(definition.id, index) : undefined,
    nextRoute: index < paginated.length - 1 ? toRoute(definition.id, index + 2) : undefined,
    homeRoute: "/000",
  }));
});

const renderedPageMap = new Map(renderedPages.map((page) => [page.route, page] as const));

export function getMainPageDefinitions() {
  return pageDefinitions;
}

export function getRenderedPages() {
  return renderedPages;
}

export function getRenderedPage(route: BtxRoute): BtxRenderedPage | undefined {
  return renderedPageMap.get(toRoute(route.page, route.subpage ?? 1));
}

export function getStaticPageParams() {
  return renderedPages.map((page) => ({
    params: {
      page: page.id,
      ...(page.subpage > 1 ? { subpage: String(page.subpage) } : {}),
    },
  }));
}

export function getExcerpt(page: BtxRenderedPage): string {
  return page.bodyLines
    .map(stripLineText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
