import type { SearchEntry } from "@/lib/btx/types";

function shorten(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 3).trimEnd()}...`;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function rank(query: string, entries: SearchEntry[]): SearchEntry[] {
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

      if (title === needle) score += 1200;
      if (title.startsWith(needle)) score += 800;
      if (title.includes(needle)) score += 500;
      if (keywords.some((keyword) => keyword === needle)) score += 400;
      if (keywords.some((keyword) => keyword.startsWith(needle))) score += 300;
      if (keywords.some((keyword) => keyword.includes(needle))) score += 200;
      if (excerpt.includes(needle)) score += 100;

      return { entry, score };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.route.localeCompare(right.entry.route);
    })
    .slice(0, 8)
    .map((result) => result.entry);
}

function initNavInput() {
  const navInput = document.querySelector<HTMLInputElement>("[data-btx-nav-input]");
  const navForm = document.querySelector<HTMLFormElement>("[data-btx-nav-form]");
  const backButton = document.querySelector<HTMLButtonElement>("[data-btx-back-button]");

  if (!navInput || !navForm) {
    return;
  }

  const navigateToPage = () => {
    const value = navInput.value.replace(/\D/g, "");

    if (value.length !== 3) {
      return;
    }

    window.location.assign(`/${value}`);
  };

  navForm.addEventListener("submit", (event) => {
    event.preventDefault();
    navigateToPage();
  });

  backButton?.addEventListener("click", () => {
    window.history.back();
  });

  document.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    const searchInput = active instanceof HTMLElement && active.dataset.btxSearchInput !== undefined;

    if (searchInput) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      window.location.assign("/000");
      return;
    }

    if (event.key === "Escape") {
      navInput.value = "";
      return;
    }

    if (event.key === "Backspace" && active !== navInput) {
      event.preventDefault();
      navInput.value = navInput.value.slice(0, -1);
      navInput.focus();
      return;
    }

    if (/^\d$/.test(event.key) && active !== navInput) {
      event.preventDefault();
      navInput.focus();
      navInput.value = `${navInput.value}${event.key}`.slice(0, 3);
      return;
    }

    if (event.key === "Enter" && active !== navInput) {
      if (navInput.value.length === 3) {
        event.preventDefault();
        navigateToPage();
      }
    }
  });
}

function initSearch() {
  const searchInput = document.querySelector<HTMLInputElement>("[data-btx-search-input]");
  const resultNodes = [...document.querySelectorAll<HTMLAnchorElement>("[data-btx-search-result]")];
  const indexNode = document.getElementById("btx-search-index");

  if (!searchInput || resultNodes.length === 0 || !indexNode?.textContent) {
    return;
  }

  const entries = JSON.parse(indexNode.textContent) as SearchEntry[];

  const render = () => {
    const query = searchInput.value.trim();
    const results = rank(query, entries);

    resultNodes.forEach((node, index) => {
      const result = results[index];

      if (!query) {
        node.textContent = index === 0 ? "STICHWORT EINGEBEN" : "\u00a0";
        node.href = "/800";
        return;
      }

      if (!result) {
        node.textContent = index === 0 ? "KEIN TREFFER" : "\u00a0";
        node.href = "/800";
        return;
      }

      const routeLabel = result.subpage ? `${result.page}/${result.subpage}` : result.page;
      node.textContent = shorten(`${routeLabel} ${result.title.toUpperCase()}`, 40);
      node.href = result.route;
      node.setAttribute("aria-label", `${routeLabel} ${result.title}`);
    });
  };

  searchInput.addEventListener("input", render);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstResult = rank(searchInput.value, entries)[0];

      if (firstResult) {
        window.location.assign(firstResult.route);
      }
    }
  });

  render();
}

export function initBtxScreen() {
  initNavInput();
  initSearch();
}
