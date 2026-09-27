import type { ConnectionState } from "./connection";

export const SCREEN_COLUMNS = 40;
export const SCREEN_ROWS = 24;

export type Tone = "white" | "yellow" | "cyan" | "green" | "red" | "magenta" | "blue" | "dim";
export interface ScreenSegment { text: string; tone?: Tone; background?: Tone }
export interface ScreenRow { segments: ScreenSegment[]; double?: boolean; action?: "connect"; decorative?: boolean }

export interface LocalScreenInfo {
  state: ConnectionState;
  /** Name of the modem standard, e.g. "V.23 · 1200/75". */
  profile: string;
  acoustic: boolean;
  speed: number | "LINE";
  dialed?: string;
  line?: string;
  summary?: { duration: string; units: number; charge: string };
}

/** Teletext sextant mosaic for a 2×3 cell; bit 0 is top left, bit 5 bottom right. */
export function sextant(bits: number) {
  const value = bits & 63;
  if (value === 0) return " ";
  if (value === 21) return "▌";
  if (value === 42) return "▐";
  if (value === 63) return "█";
  return String.fromCodePoint(0x1fb00 + value - 1 - (value > 21 ? 1 : 0) - (value > 42 ? 1 : 0));
}

/** Converts a pixel bitmap ('#' on) into rows of sextant characters. */
export function mosaic(bitmap: string[]): string[] {
  const rows: string[] = [];
  const width = Math.max(...bitmap.map((line) => line.length));
  for (let y = 0; y < bitmap.length; y += 3) {
    let row = "";
    for (let x = 0; x < width; x += 2) {
      let bits = 0;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) if (bitmap[y + dy]?.[x + dx] === "#") bits |= 1 << (dy * 2 + dx);
      row += sextant(bits);
    }
    rows.push(row);
  }
  return rows;
}

const LOGO = mosaic([
  "########.....##................",
  "##.....##....##................",
  "##.....##.#########.##.....##..",
  "##....##.....##......##...##...",
  "#######......##.......##.##....",
  "##....##.....##........###.....",
  "##.....##....##.......##.##....",
  "##.....##....##..##..##...##...",
  "########......####..##.....##..",
]);

const blank = (): ScreenRow => ({ segments: [] });
const text = (value: string, tone: Tone = "white", extra: Partial<ScreenRow> = {}): ScreenRow => ({ segments: [{ text: value, tone }], ...extra });

function frame(body: ScreenRow[], status: string, info: LocalScreenInfo): ScreenRow[] {
  const rows: ScreenRow[] = [
    blank(),
    ...LOGO.map((line) => ({ segments: [{ text: `  ${line}`, tone: "yellow" as Tone }], decorative: true })),
    blank(),
    text("  Bildschirmtext", "white", { double: true }),
    blank(),
    text(`  ${"─".repeat(36)}`, "cyan", { decorative: true }),
    ...body,
  ];
  while (rows.length < SCREEN_ROWS - 2) rows.push(blank());
  rows.length = SCREEN_ROWS - 2;
  rows.push(text(`  ${info.acoustic ? "Akustikkoppler" : info.speed === "LINE" ? "Direktanschluss" : "Modem"} · ${info.profile}${info.speed === "LINE" ? "" : " bit/s"}`, "dim"));
  const label = ` ${status}`.padEnd(SCREEN_COLUMNS, " ").slice(0, SCREEN_COLUMNS);
  rows.push({ segments: [{ text: label, tone: "blue", background: "cyan" }] });
  return rows;
}

function channels(info: LocalScreenInfo): ScreenRow[] {
  if (info.speed === 300) return [text("  Kanal 2   300 bit/s  1650/1850 Hz", "dim"), text("  Kanal 1   300 bit/s   980/1180 Hz", "dim")];
  if (info.speed === 1200) return [text("  Hauptkanal 1200 bit/s  1300/2100 Hz", "dim"), text("  Rückkanal    75 bit/s   390/450 Hz", "dim")];
  if (info.speed === 2400) return [text("  V.22bis  2400 bit/s  QAM 600 Bd", "dim"), text("  Träger   2400/1200 Hz", "dim")];
  if (info.speed === 9600) return [text("  V.32  9600 bit/s  QAM 2400 Bd", "dim"), text("  Echokompensation aktiv", "dim")];
  return [text("  Direktverbindung ohne Modem", "dim")];
}

export function localScreen(info: LocalScreenInfo): ScreenRow[] {
  if (info.state === "off" || info.state === "online") return Array.from({ length: SCREEN_ROWS }, blank);
  if (info.state === "idle") {
    const summary = info.summary
      ? [blank(), text(`  Letzte Verbindung   ${info.summary.duration}`, "dim"), text(`  ${info.summary.units} ${info.summary.units === 1 ? "Einheit " : "Einheiten"}         ${info.summary.charge}`, "dim")]
      : [];
    const steps = info.acoustic
      ? [text("  Anwahl der Btx-Zentrale:", "dim"), text("   1  Hörer abheben"), text("   2  0 1 9 1 0  wählen"), text("   3  Bei Pfeifton den Hörer in den"), text("      Akustikkoppler legen")]
      : [text("  Anwahl der Btx-Zentrale:", "dim"), text(info.speed === "LINE" ? "   Direktanschluss ohne Wahl" : "   Das Modem wählt selbsttätig"), text("   0 1 9 1 0"), blank(), blank()];
    return frame([
      blank(),
      text("  Terminal betriebsbereit."),
      blank(),
      ...steps,
      blank(),
      { segments: [{ text: "  ▶ Verbindung aufbauen", tone: "cyan" }, { text: "              ↵", tone: "cyan" }], action: "connect" },
      ...summary,
    ], "BTX-TERMINAL  1200/75       SELBSTTEST OK", info);
  }
  if (info.state === "lifting" || info.state === "dialing") {
    const dialed = (info.dialed ?? "").padEnd(5, "_");
    return frame([
      blank(),
      text(info.state === "lifting" ? "  Hörer abgehoben." : "  Wählvorgang läuft."),
      blank(),
      text("  Rufnummer der Btx-Zentrale", "dim"),
      text(`  ${[...dialed].join(" ")}`, "yellow", { double: true }),
      blank(),
      blank(),
      text("  Leitung", "dim"),
      text(`  ${info.line ?? "Wählton 425 Hz"}`),
    ], `ANWAHL ${info.dialed ?? ""}`.padEnd(26) + "BITTE WARTEN", info);
  }
  if (info.state === "answering") {
    return frame([
      blank(),
      text("  Die Btx-Zentrale antwortet."),
      blank(),
      text("  Antwortton 2100 Hz", "dim"),
      blank(),
      ...(info.acoustic ? [text("  Hörer jetzt in den Akustikkoppler", "yellow"), text("  legen.", "yellow")] : [text("  Modem synchronisiert …", "yellow")]),
    ], "VERBINDUNG                  BITTE WARTEN", info);
  }
  if (info.state === "coupling") {
    return frame([
      blank(),
      text("  Datenträger erkannt."),
      blank(),
      ...channels(info),
      blank(),
      text("  Anschlusskennung wird übertragen …"),
    ], "TRÄGER                      BITTE WARTEN", info);
  }
  return frame([
    blank(),
    text("  Träger verloren.", "red"),
    blank(),
    text("  Die Verbindung zur Btx-Zentrale ist"),
    text("  unterbrochen."),
    blank(),
    text("  Hörer wieder in den Akustikkoppler", "dim"),
    text("  legen, um fortzufahren.", "dim"),
    blank(),
    { segments: [{ text: "  ▶ Hörer einsetzen", tone: "cyan" }, { text: "                  ↵", tone: "cyan" }], action: "connect" },
  ], "KEIN TRÄGER                  HÖRER EINLEGEN", info);
}
