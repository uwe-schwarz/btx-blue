const COLUMNS = 40;
const ROWS = 24;
/** Layout of `.btx-screen` in 3D mode (see terminal.css): 800×600 with 40/32 px padding and a 720×528 grid. */
export const SCREEN_CSS = { width: 800, height: 600, padX: 40, padY: 32, gridWidth: 720, gridHeight: 528 } as const;

interface Run { row: number; col: number; text: string; color: string; double: boolean }
interface Fill { x: number; y: number; width: number; height: number; color: string; row: number; col: number }
interface Caret { row: number; col: number; color: string; char: string; background: string }

const transparent = (color: string) => color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color);

/**
 * Paints the live Btx grid into a canvas that the CRT shader samples.
 * The HTML stays the accessible, interactive source of truth; this is only what the phosphor shows.
 */
export class ScreenRaster {
  readonly canvas = document.createElement("canvas");
  readonly previous = document.createElement("canvas");
  private context: CanvasRenderingContext2D;
  private runs: Run[] = [];
  private fills: Fill[] = [];
  private carets: Caret[] = [];
  private dirty = true;
  private reveal = -1;
  private caretOn = true;
  private background = "#03177d";
  private metrics?: { scale: number; ascent: number; descent: number };
  private observer: MutationObserver;
  private abort = new AbortController();
  /** Increments whenever the canvas pixels change. */
  version = 0;
  onChange?: () => void;

  constructor(private screen: HTMLElement, private width = 1024, private height = 768) {
    this.canvas.width = this.previous.width = width;
    this.canvas.height = this.previous.height = height;
    this.context = this.canvas.getContext("2d")!;
    this.observer = new MutationObserver(() => this.invalidate());
    this.observer.observe(screen, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden", "value", "placeholder"] });
    const options = { signal: this.abort.signal, capture: true };
    for (const type of ["input", "focusin", "focusout", "pointerover", "pointerout", "keyup", "select"]) screen.addEventListener(type, () => this.invalidate(), options);
    document.addEventListener("selectionchange", () => this.invalidate(), { signal: this.abort.signal });
    void document.fonts.ready.then(() => { this.metrics = undefined; this.invalidate(); });
  }

  invalidate() {
    this.dirty = true;
    this.onChange?.();
  }

  /** Keeps a copy of the current picture so the phosphor can fade it out behind a new page. */
  snapshot() {
    const context = this.previous.getContext("2d")!;
    context.clearRect(0, 0, this.width, this.height);
    context.drawImage(this.canvas, 0, 0);
  }

  get hasCaret() { return this.carets.length > 0; }

  dispose() {
    this.observer.disconnect();
    this.abort.abort();
  }

  private activeGrid() {
    const local = this.screen.querySelector<HTMLElement>(".screen-connection:not([hidden]) [data-local-grid]");
    return local ?? this.screen.querySelector<HTMLElement>("[data-btx-grid]");
  }

  private measure() {
    const rowHeight = SCREEN_CSS.gridHeight / ROWS;
    const context = this.context;
    const scale = this.width / SCREEN_CSS.width;
    context.font = `${rowHeight * scale}px Bedstead, Unscii, monospace`;
    const sample = context.measureText("0");
    const cellWidth = (SCREEN_CSS.gridWidth / COLUMNS) * scale;
    this.metrics = {
      scale: cellWidth / sample.width,
      ascent: sample.fontBoundingBoxAscent || rowHeight * scale * 0.8,
      descent: sample.fontBoundingBoxDescent || rowHeight * scale * 0.2,
    };
  }

  private buildModel(grid: HTMLElement) {
    this.runs = [];
    this.fills = [];
    this.carets = [];
    this.background = getComputedStyle(this.screen).backgroundColor || this.background;
    const cell = grid.offsetWidth / COLUMNS || 12;
    const rowHeight = grid.offsetHeight / ROWS || 22;
    const offset = (element: HTMLElement) => {
      let left = 0, top = 0;
      for (let node: HTMLElement | null = element; node && node !== grid; node = node.offsetParent as HTMLElement | null) {
        left += node.offsetLeft; top += node.offsetTop;
        if (!node.offsetParent || node.offsetParent === document.body) return undefined;
      }
      return { left, top };
    };
    const rowOf = (top: number) => Math.max(0, Math.min(ROWS - 1, Math.floor(top / rowHeight + 0.25)));
    const hidden = (element: Element) => Boolean(element.closest(".sr-only, [hidden], .screen-afterglow, script"));

    for (const element of grid.querySelectorAll<HTMLElement>("*")) {
      if (hidden(element) || element.getClientRects().length === 0) continue;
      const style = getComputedStyle(element);
      if (!transparent(style.backgroundColor)) {
        const position = offset(element);
        if (position) {
          const col = position.left / cell, row = position.top / rowHeight;
          this.fills.push({ x: col, y: row, width: element.offsetWidth / cell, height: element.offsetHeight / rowHeight, color: style.backgroundColor, row: Math.floor(row + 0.25), col: Math.floor(col) });
        }
      }
      if (element instanceof HTMLInputElement) {
        const position = offset(element);
        if (!position) continue;
        const col = Math.round(position.left / cell), row = rowOf(position.top);
        const columns = Math.max(1, Math.round(element.offsetWidth / cell));
        const empty = element.value === "";
        const value = empty ? element.placeholder : element.value;
        const color = empty ? getComputedStyle(element, "::placeholder").color : style.color;
        const visible = value.slice(Math.max(0, (element.selectionStart ?? value.length) - columns + 1)).slice(0, columns);
        if (visible) this.runs.push({ row, col, text: visible, color, double: false });
        if (document.activeElement === element) {
          const caretCol = col + Math.min(columns - 1, empty ? 0 : (element.selectionStart ?? element.value.length));
          this.carets.push({ row, col: caretCol, color: style.color, char: empty ? "" : element.value[element.selectionStart ?? 0] ?? "", background: this.background });
        }
      }
    }

    const walker = document.createTreeWalker(grid, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const parent = node.parentElement;
      if (!parent || hidden(parent)) continue;
      const style = getComputedStyle(parent);
      const pre = style.whiteSpace.startsWith("pre");
      let value = node.data.replace(/\n/g, "");
      if (!pre) value = value.replace(/\s+/g, " ").trim();
      if (!value.trim()) continue;
      const position = offset(parent);
      if (!position) continue;
      let col = position.left / cell;
      // Text in block boxes follows text-align; inline boxes already start where their text starts.
      if (!style.display.startsWith("inline")) {
        let before = 0;
        for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) before += (sibling.textContent ?? "").length;
        const length = [...value].length;
        const width = parent.offsetWidth / cell;
        if (style.textAlign === "right" || style.textAlign === "end") col += width - length;
        else if (style.textAlign === "center") col += (width - length) / 2;
        else col += pre ? before : 0;
      }
      this.runs.push({ row: rowOf(position.top), col: Math.round(col), text: value, color: style.color, double: Boolean(parent.closest(".btx-line--double")) });
    }
  }

  private revealLimit(grid: HTMLElement) {
    if (!grid.classList.contains("btx-grid--revealing")) return Infinity;
    const row = Number.parseFloat(grid.style.getPropertyValue("--btx-reveal-row")) || 0;
    const col = Number.parseFloat(grid.style.getPropertyValue("--btx-reveal-col")) || 0;
    return row * COLUMNS + col;
  }

  /** Redraws when the page, reveal position or caret phase changed; returns whether pixels changed. */
  update(time: number) {
    const grid = this.activeGrid();
    if (!grid) return false;
    const reveal = this.revealLimit(grid);
    const caretOn = Math.floor(time / 330) % 2 === 0;
    const caretChanged = this.carets.length > 0 && caretOn !== this.caretOn;
    if (!this.dirty && reveal === this.reveal && !caretChanged) return false;
    if (this.dirty) { this.buildModel(grid); if (!this.metrics) this.measure(); }
    this.dirty = false;
    this.reveal = reveal;
    this.caretOn = caretOn;
    this.paint(reveal);
    this.version++;
    return true;
  }

  private paint(reveal: number) {
    const { context, width, height } = this;
    const metrics = this.metrics!;
    const scale = width / SCREEN_CSS.width;
    const cellWidth = (SCREEN_CSS.gridWidth / COLUMNS) * scale;
    const cellHeight = (SCREEN_CSS.gridHeight / ROWS) * scale;
    const left = SCREEN_CSS.padX * scale, top = SCREEN_CSS.padY * scale;
    const shown = (row: number, col: number) => row * COLUMNS + col < reveal;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = this.background;
    context.fillRect(0, 0, width, height);
    for (const fill of this.fills) {
      if (!shown(fill.row, fill.col)) continue;
      context.fillStyle = fill.color;
      context.fillRect(left + fill.x * cellWidth, top + fill.y * cellHeight, fill.width * cellWidth, fill.height * cellHeight);
    }
    const lineGap = (cellHeight - (metrics.ascent + metrics.descent)) / 2;
    for (const run of this.runs) {
      context.fillStyle = run.color;
      [...run.text].forEach((char, index) => {
        const col = run.col + index;
        if (char === " " || char === " " || col < 0 || col >= COLUMNS || !shown(run.row, col)) return;
        const x = left + col * cellWidth, y = top + run.row * cellHeight;
        const vertical = run.double ? 2 : 1;
        context.setTransform(metrics.scale, 0, 0, vertical, x, y);
        context.fillText(char, 0, lineGap + metrics.ascent);
      });
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (this.caretOn) {
      for (const caret of this.carets) {
        if (!shown(caret.row, caret.col)) continue;
        const x = left + caret.col * cellWidth, y = top + caret.row * cellHeight;
        context.fillStyle = caret.color;
        context.fillRect(x, y + cellHeight * 0.08, cellWidth, cellHeight * 0.86);
        if (caret.char) {
          context.fillStyle = caret.background;
          context.setTransform(metrics.scale, 0, 0, 1, x, y);
          context.fillText(caret.char, 0, lineGap + metrics.ascent);
          context.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    }
  }
}
