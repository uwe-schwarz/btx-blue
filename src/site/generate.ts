import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getRenderedPage, getRenderedPages } from "@/lib/btx/page-registry";
import { NOT_FOUND_PAGE } from "@/lib/btx/not-found-page";
import { buildRobotsTxt, buildSitemapXml } from "@/lib/agent-ready";
import { renderDocument, type Assets } from "./render";

export async function generateSite(assets: Assets) {
  const write = async (path: string, body: string) => {
    await mkdir(dirname(`dist/${path}`), { recursive: true });
    await writeFile(`dist/${path}`, body);
  };
  const pages = getRenderedPages();
  const paths = new Set<string>();
  for (const page of pages) {
    if (paths.has(page.route)) throw new Error(`Duplicate BTX route: ${page.route}`);
    paths.add(page.route);
    await write(`${page.route.slice(1)}/index.html`, renderDocument(page, assets));
  }
  const home = getRenderedPage({ page: "000" });
  if (!home) throw new Error("Missing BTX home page 000");
  await write("index.html", renderDocument(home, assets, true));
  await write("404.html", renderDocument(NOT_FOUND_PAGE, assets));
  await write("sitemap.xml", buildSitemapXml());
  await write("robots.txt", buildRobotsTxt());
  console.log(`Generated ${pages.length + 2} HTML pages, sitemap and robots.txt.`);
}
