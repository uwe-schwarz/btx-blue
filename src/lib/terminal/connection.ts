export type ConnectionState = "idle" | "lifting" | "dialing" | "answering" | "coupling" | "online" | "paused" | "off";
export type ModemSpeed = "LINE" | 300 | 1200 | 2400 | 9600;

export const MODEM_PROFILES = {
  LINE: { name: "Direkt", rate: 0, symbolRate: 0, mark: 0, space: 0, acoustic: false },
  300: { name: "V.21 · 300", rate: 300, symbolRate: 300, mark: 1650, space: 1850, acoustic: true },
  1200: { name: "V.23 · 1200/75", rate: 1200, symbolRate: 1200, mark: 1300, space: 2100, acoustic: true },
  2400: { name: "V.22bis · 2400", rate: 2400, symbolRate: 600, mark: 1200, space: 2400, acoustic: false },
  9600: { name: "V.32 · 9600", rate: 9600, symbolRate: 2400, mark: 1800, space: 1800, acoustic: false },
} as const;

export function parseModemSpeed(value: string | null): ModemSpeed {
  if (value === "LINE") return "LINE";
  const speed = Number(value);
  return speed === 300 || speed === 2400 || speed === 9600 ? speed : 1200;
}

export const CONNECTION_LABELS: Record<ConnectionState, string> = {
  idle: "Bereit zur Einwahl",
  lifting: "Hörer abgehoben · Wählton",
  dialing: "Wähle 01910 …",
  answering: "Btx-Zentrale antwortet …",
  coupling: "Träger wird erkannt …",
  online: "Verbindung hergestellt",
  paused: "Träger verloren · Hörer einsetzen",
  off: "Terminal ausgeschaltet",
};

export const BUSY_STATES: ReadonlySet<ConnectionState> = new Set(["lifting", "dialing", "answering", "coupling"]);

/** Deutsche Bundespost, 1985: 0,23 DM per Gebühreneinheit; Btx was reached at the local rate. */
export const UNIT_PRICE_DM = 0.23;

/** Local calls cost one unit per 8 minutes on weekdays 8–18 h, otherwise one unit per 12 minutes. */
export function tariffInterval(at: Date) {
  const weekday = at.getDay() >= 1 && at.getDay() <= 5;
  return weekday && at.getHours() >= 8 && at.getHours() < 18 ? 480 : 720;
}

export function callUnits(seconds: number, at: Date) {
  return 1 + Math.floor(Math.max(0, seconds) / tariffInterval(at));
}

export function formatDm(amount: number) {
  return `${amount.toFixed(2).replace(".", ",")} DM`;
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}
