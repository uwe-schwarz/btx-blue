import type { BtxRenderedPage } from "@/lib/btx/types";

export const NOT_FOUND_PAGE: BtxRenderedPage = {
  id: "404",
  title: "Seite nicht vorhanden",
  keywords: ["404", "Fehler", "Seite nicht vorhanden"],
  subpage: 1,
  route: "/404",
  headerLines: [
    "BTX.BLUE            UWE SCHWARZ 404",
    "========================================",
    "SEITE NICHT VORHANDEN",
  ],
  bodyLines: [
    { kind: "text", text: "DIE ANGEFORDERTE SEITE IST IM", tone: "warning" },
    { kind: "text", text: "SYSTEM NICHT VORHANDEN.", tone: "warning" },
    { kind: "blank" },
    { kind: "text", text: "PRUEFEN SIE DIE SEITENNUMMER", tone: "default" },
    { kind: "text", text: "ODER GEHEN SIE ZUR STARTSEITE.", tone: "default" },
    { kind: "blank" },
    { kind: "link", text: "000 ZUR STARTSEITE", route: "/000", tone: "success", ariaLabel: "000 Zur Startseite" },
    ...Array.from({ length: 13 }, () => ({ kind: "blank" as const })),
  ],
  statusHint: "HOME 000  ZURUECK  SUCHE 800",
  homeRoute: "/000",
};
