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
  idle: "Bereit zur Einwahl", lifting: "Hörer abheben …", dialing: "Wähle 01910 …",
  answering: "Gegenstelle antwortet …", coupling: "Träger wird erkannt …", online: "Verbindung hergestellt",
  paused: "Träger verloren · Hörer einsetzen", off: "Terminal ausgeschaltet",
};

export const CONNECTION_STEPS: ReadonlyArray<readonly [ConnectionState, number]> = [
  ["lifting", 850], ["dialing", 4700], ["answering", 1800], ["coupling", 1600], ["online", 0],
];
