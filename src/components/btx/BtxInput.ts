import type { SearchEntry } from "@/lib/btx/types";
import { applyBitFlipNoise } from "@/lib/btx/bitflip";

const BAUD_OPTIONS = ["LINE", 300, 1200, 2400, 9600] as const;
const DEFAULT_BAUD = 1200;
const BAUD_STORAGE_KEY = "btx-baud";
const BIT_FLIP_ENABLED_STORAGE_KEY = "btx-bit-flip-enabled";
const BIT_FLIP_NOISE_STORAGE_KEY = "btx-bit-flip-noise";
const MAX_BIT_FLIP_NOISE = 10;
const DEFAULT_BIT_FLIP_NOISE = 2;
const BTX_COLUMNS = 40;
const BTX_ROWS = 24;
const BTX_TOTAL_CELLS = BTX_COLUMNS * BTX_ROWS;

type BtxBaud = (typeof BAUD_OPTIONS)[number];

function isBtxBaud(value: string | number): value is BtxBaud {
  return BAUD_OPTIONS.includes(value as BtxBaud);
}

function parseBaud(value: string | null): BtxBaud {
  const parsed = value === "LINE" ? value : Number(value);
  return isBtxBaud(parsed) ? parsed : DEFAULT_BAUD;
}

function readBaudPreference(): BtxBaud {
  try {
    return parseBaud(window.localStorage.getItem(BAUD_STORAGE_KEY));
  } catch {
    return DEFAULT_BAUD;
  }
}

function writeBaudPreference(baud: BtxBaud) {
  try {
    window.localStorage.setItem(BAUD_STORAGE_KEY, String(baud));
  } catch {
    // Ignore storage failures and keep the in-memory selection.
  }
}

function parseNoiseLevel(value: string | null): number {
  if (value === null || value.trim() === "") {
    return DEFAULT_BIT_FLIP_NOISE;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BIT_FLIP_NOISE;
  }

  return Math.min(MAX_BIT_FLIP_NOISE, Math.max(0, Math.round(parsed * 10) / 10));
}

function formatNoiseLevel(level: number): string {
  return `${parseNoiseLevel(String(level)).toFixed(1)}%`;
}

function readBitFlipEnabledPreference(): boolean {
  try {
    return window.localStorage.getItem(BIT_FLIP_ENABLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeBitFlipEnabledPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(BIT_FLIP_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage failures and keep the in-memory selection.
  }
}

function readBitFlipNoisePreference(): number {
  try {
    return parseNoiseLevel(window.localStorage.getItem(BIT_FLIP_NOISE_STORAGE_KEY));
  } catch {
    return DEFAULT_BIT_FLIP_NOISE;
  }
}

function writeBitFlipNoisePreference(level: number) {
  try {
    window.localStorage.setItem(BIT_FLIP_NOISE_STORAGE_KEY, String(parseNoiseLevel(String(level))));
  } catch {
    // Ignore storage failures and keep the in-memory selection.
  }
}

class BtxRevealController {
  private animationFrame = 0;

  constructor(private readonly grid: HTMLElement) {}

  animate(baud: BtxBaud) {
    this.stop();

    if (baud === "LINE" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.revealAll();
      return;
    }

    const charsPerSecond = baud / 10;
    const durationMs = (BTX_TOTAL_CELLS / charsPerSecond) * 1000;
    const startTime = performance.now();

    this.grid.classList.add("btx-grid--revealing");
    this.setRevealPosition(0);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const revealedCells = Math.min(BTX_TOTAL_CELLS, Math.floor((elapsed / 1000) * charsPerSecond));

      this.setRevealPosition(revealedCells);

      if (revealedCells >= BTX_TOTAL_CELLS) {
        this.revealAll();
        return;
      }

      if (elapsed >= durationMs) {
        this.revealAll();
        return;
      }

      this.animationFrame = window.requestAnimationFrame(tick);
    };

    this.animationFrame = window.requestAnimationFrame(tick);
  }

  private setRevealPosition(revealedCells: number) {
    const clamped = Math.max(0, Math.min(BTX_TOTAL_CELLS, revealedCells));
    const row = Math.min(BTX_ROWS, Math.floor(clamped / BTX_COLUMNS));
    const col = clamped % BTX_COLUMNS;

    this.grid.style.setProperty("--btx-reveal-row", String(row));
    this.grid.style.setProperty("--btx-reveal-col", String(col));
  }

  private revealAll() {
    this.stop();
    this.grid.classList.remove("btx-grid--revealing");
    this.grid.style.removeProperty("--btx-reveal-row");
    this.grid.style.removeProperty("--btx-reveal-col");
  }

  private stop() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
  }
}

class BtxNoiseController {
  private enabled = false;
  private noiseLevel = DEFAULT_BIT_FLIP_NOISE;

  constructor(private readonly root: ParentNode) {}

  update(enabled: boolean, noiseLevel: number) {
    this.enabled = enabled;
    this.noiseLevel = parseNoiseLevel(String(noiseLevel));
    this.refresh();
  }

  setSource(node: HTMLElement, text: string) {
    node.dataset.btxNoiseText = text;
    node.textContent = this.render(text);
  }

  refresh() {
    const noiseTargets = [...this.root.querySelectorAll<HTMLElement>("[data-btx-noise-text]")];

    noiseTargets.forEach((target) => {
      const source = target.dataset.btxNoiseText ?? target.textContent ?? "";
      target.textContent = this.render(source);
    });
  }

  private render(text: string): string {
    if (!this.enabled) {
      return text;
    }

    return applyBitFlipNoise(text, this.noiseLevel / 100);
  }
}

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
  const prevPageLink = document.querySelector<HTMLAnchorElement>(".btx-page-nav-link--left");
  const nextPageLink = document.querySelector<HTMLAnchorElement>(".btx-page-nav-link--right");
  let commandPrefix: "#" | "*" | null = null;
  let commandResetTimer = 0;

  if (!navInput || !navForm) {
    return;
  }

  navInput.value = "";

  const resetCommandPrefix = () => {
    commandPrefix = null;
    if (commandResetTimer) {
      window.clearTimeout(commandResetTimer);
      commandResetTimer = 0;
    }
  };

  const armCommandPrefix = (prefix: "#" | "*") => {
    commandPrefix = prefix;
    if (commandResetTimer) {
      window.clearTimeout(commandResetTimer);
    }
    commandResetTimer = window.setTimeout(() => {
      commandPrefix = null;
      commandResetTimer = 0;
    }, 1200);
  };

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
    const navActive = active === navInput;

    if (searchInput) {
      return;
    }

    if (!navActive && (event.key === "#" || event.key === "*")) {
      event.preventDefault();
      armCommandPrefix(event.key as "#" | "*");
      return;
    }

    if (!navActive && commandPrefix) {
      const command = event.key.toUpperCase();

      if (commandPrefix === "#" && command === "H") {
        event.preventDefault();
        resetCommandPrefix();
        window.location.assign("/000");
        return;
      }

      if (commandPrefix === "*" && command === "S") {
        event.preventDefault();
        resetCommandPrefix();
        window.location.assign("/800");
        return;
      }

      if (commandPrefix === "*" && command === "Z") {
        event.preventDefault();
        resetCommandPrefix();
        window.history.back();
        return;
      }

      resetCommandPrefix();
    }

    if (event.key === "Home") {
      event.preventDefault();
      window.location.assign("/000");
      return;
    }

    if (event.key === "Escape") {
      navInput.value = "";
      resetCommandPrefix();
      return;
    }

    if ((event.key === "PageUp" || event.key === "ArrowLeft") && prevPageLink) {
      event.preventDefault();
      window.location.assign(prevPageLink.href);
      return;
    }

    if ((event.key === "PageDown" || event.key === "ArrowRight") && nextPageLink) {
      event.preventDefault();
      window.location.assign(nextPageLink.href);
      return;
    }

    if (event.key === "Backspace" && !navActive) {
      event.preventDefault();
      navInput.value = navInput.value.slice(0, -1);
      navInput.focus();
      return;
    }

    if (/^\d$/.test(event.key) && !navActive) {
      event.preventDefault();
      navInput.focus();
      navInput.value = `${navInput.value}${event.key}`.slice(0, 3);
      return;
    }

    if (event.key === "Enter" && !navActive) {
      if (navInput.value.length === 3) {
        event.preventDefault();
        navigateToPage();
      }
    }
  });
}

function initSearch(noiseController: BtxNoiseController) {
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
        noiseController.setSource(node, index === 0 ? "STICHWORT EINGEBEN" : "\u00a0");
        node.href = "/800";
        node.setAttribute("aria-label", index === 0 ? "Stichwort eingeben" : `Suchtreffer ${index + 1}`);
        return;
      }

      if (!result) {
        noiseController.setSource(node, index === 0 ? "KEIN TREFFER" : "\u00a0");
        node.href = "/800";
        node.setAttribute("aria-label", index === 0 ? "Kein Treffer" : `Suchtreffer ${index + 1}`);
        return;
      }

      const routeLabel = result.subpage ? `${result.page}/${result.subpage}` : result.page;
      noiseController.setSource(node, shorten(`${routeLabel} ${result.title.toUpperCase()}`, 40));
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

function initBaudControl() {
  const grid = document.querySelector<HTMLElement>("[data-btx-grid]");
  const baudForm = document.querySelector<HTMLFormElement>("[data-btx-baud-form]");
  const baudInputs = [...document.querySelectorAll<HTMLInputElement>("[data-btx-baud-option]")];

  if (!grid) {
    return;
  }

  const revealController = new BtxRevealController(grid);
  const initialBaud = readBaudPreference();

  baudInputs.forEach((input) => {
    input.checked = parseBaud(input.value) === initialBaud;
  });

  revealController.animate(initialBaud);

  if (!baudForm) {
    return;
  }

  baudForm.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.dataset.btxBaudOption === undefined) {
      return;
    }

    const baud = parseBaud(target.value);
    writeBaudPreference(baud);
    revealController.animate(baud);
  });
}

function initBitFlipControl(): BtxNoiseController | null {
  const grid = document.querySelector<HTMLElement>("[data-btx-grid]");
  const enabledInput = document.querySelector<HTMLInputElement>("[data-btx-noise-enabled]");
  const levelInput = document.querySelector<HTMLInputElement>("[data-btx-noise-level]");
  const valueNode = document.querySelector<HTMLElement>("[data-btx-noise-value]");

  if (!grid || !enabledInput || !levelInput || !valueNode) {
    return null;
  }

  const noiseController = new BtxNoiseController(grid);
  const syncUi = () => {
    const enabled = enabledInput.checked;
    const level = parseNoiseLevel(levelInput.value);

    levelInput.disabled = !enabled;
    valueNode.textContent = formatNoiseLevel(level);
    writeBitFlipEnabledPreference(enabled);
    writeBitFlipNoisePreference(level);
    noiseController.update(enabled, level);
  };

  enabledInput.checked = readBitFlipEnabledPreference();
  levelInput.value = String(readBitFlipNoisePreference());

  enabledInput.addEventListener("change", syncUi);
  levelInput.addEventListener("input", syncUi);

  syncUi();
  return noiseController;
}

export function initBtxScreen() {
  const noiseController = initBitFlipControl();
  initBaudControl();
  initNavInput();

  if (noiseController) {
    initSearch(noiseController);
    noiseController.refresh();
    return;
  }

  initSearch(new BtxNoiseController(document));
}
