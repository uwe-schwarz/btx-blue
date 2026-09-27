let navigate: ((url: string) => Promise<void>) | undefined;

export function navigateBtx(url: string) {
  if (navigate) void navigate(url);
  else window.location.assign(url);
}

/** Keep the physical desk and audio context alive while replacing only page content. */
export function initBtxNavigation(onPage: () => void) {
  let activeRequest: AbortController | undefined;
  const load = async (href: string, push = true) => {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.assign(url.href); return; }
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    document.documentElement.dataset.pageLoading = "true";
    try {
      const response = await fetch(url.href, { signal: request.signal, headers: { Accept: "text/html" } });
      if (!response.ok && response.status !== 404) throw new Error(`Page request failed: ${response.status}`);
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      if (request.signal.aborted) return;
      const next = page.querySelector<HTMLElement>("[data-btx-grid]");
      const current = document.querySelector<HTMLElement>("[data-btx-grid]");
      if (!next || !current) throw new Error("Missing terminal page content");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.connection === "online") {
        const ghost = document.createElement("div");
        ghost.className = "screen-afterglow";
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        ghost.textContent = Array.from(current.children, (line) => (line.textContent ?? "").trim().slice(0, 40)).join("\n");
        current.parentElement?.append(ghost);
        window.setTimeout(() => ghost.remove(), 300);
      }
      current.replaceChildren(...Array.from(next.childNodes));
      document.getElementById("btx-search-index")?.remove();
      const search = page.getElementById("btx-search-index");
      if (search) document.querySelector("[data-terminal-source]")?.append(search);
      document.title = page.title;
      for (const selector of ['link[rel="canonical"]', 'meta[name="description"]', 'meta[name="robots"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]']) {
        const old = document.head.querySelector(selector);
        const replacement = page.head.querySelector(selector);
        if (old && replacement) old.replaceWith(replacement);
      }
      if (push) history.pushState(null, "", url.pathname + url.search + url.hash);
      onPage();
      document.dispatchEvent(new Event("btx:page"));
    } catch (error) {
      if (request.signal.aborted) return;
      console.warn("Terminal navigation fell back to a document load", error);
      location.assign(url.href);
    } finally {
      if (activeRequest === request) delete document.documentElement.dataset.pageLoading;
    }
  };
  navigate = (url) => load(url);
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
    if (!link || !link.closest("[data-btx-grid]") || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    void load(url.href);
  });
  window.addEventListener("popstate", () => { void load(location.href, false); });
}
