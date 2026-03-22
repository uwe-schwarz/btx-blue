import type { SearchEntry } from "@/lib/btx/types";
import { getExcerpt, getRenderedPages } from "@/lib/btx/page-registry";

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export const searchIndex: SearchEntry[] = getRenderedPages().map((page) => ({
  route: page.route,
  page: page.id,
  subpage: page.subpage > 1 ? page.subpage : undefined,
  title: page.title,
  keywords: page.keywords,
  excerpt: getExcerpt(page),
}));

export function rankSearchEntries(query: string, entries = searchIndex): SearchEntry[] {
  const needle = normalize(query.trim());

  if (!needle) {
    return [];
  }

  return entries
    .map((entry) => {
      const title = normalize(entry.title);
      const keywords = entry.keywords.map(normalize);
      const excerpt = normalize(entry.excerpt);

      let score = 0;

      if (title === needle) {
        score += 1200;
      }

      if (title.startsWith(needle)) {
        score += 800;
      }

      if (title.includes(needle)) {
        score += 500;
      }

      if (keywords.some((keyword) => keyword === needle)) {
        score += 400;
      }

      if (keywords.some((keyword) => keyword.startsWith(needle))) {
        score += 300;
      }

      if (keywords.some((keyword) => keyword.includes(needle))) {
        score += 200;
      }

      if (excerpt.includes(needle)) {
        score += 100;
      }

      return {
        entry,
        score,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.route.localeCompare(right.entry.route);
    })
    .map((result) => result.entry);
}
