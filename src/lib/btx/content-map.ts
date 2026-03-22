import { siteContent, type Experience, type Skill } from "@/content/content";
import type { BtxBodyLine, BtxLink, BtxPageDefinition, BtxPageId } from "@/lib/btx/types";
import { compactList, de, linkTo, normalizeWhitespace, shorten, toRoute, toUpperBtx, unique } from "@/lib/btx/helpers";
import { wrapText } from "@/lib/btx/wrap";

function blank(): BtxBodyLine {
  return { kind: "blank" };
}

function textLine(text: string, tone: BtxBodyLine extends infer _ ? "default" | "accent" | "dim" | "success" | "warning" : never = "default"): BtxBodyLine[] {
  return wrapText(normalizeWhitespace(text)).map((line) => ({
    kind: "text",
    text: line,
    tone,
  }));
}

function heading(text: string): BtxBodyLine[] {
  return textLine(toUpperBtx(text), "accent");
}

function bulletLines(values: string[], prefix = "* "): BtxBodyLine[] {
  return values.flatMap((value) => textLine(`${prefix}${value}`));
}

function tagLine(tags: string[], label = "STICHWORTE"): BtxBodyLine[] {
  if (tags.length === 0) {
    return [];
  }

  return textLine(`${label}: ${tags.join(", ")}`, "dim");
}

function linkLines(links: BtxLink[], tone: "default" | "accent" | "success" = "success"): BtxBodyLine[] {
  return links.flatMap((link) =>
    wrapText(`${link.page} ${toUpperBtx(link.label)}`).map((line) => ({
      kind: "link",
      text: line,
      route: link.route,
      tone,
      ariaLabel: `${link.page} ${link.label}`,
    })),
  );
}

function makePage(id: BtxPageId, title: string, keywords: string[], lines: BtxBodyLine[]): BtxPageDefinition {
  return {
    id,
    title,
    keywords: unique(keywords),
    lines,
  };
}

function splitSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function makeProjectLinks(): BtxLink[] {
  return siteContent.projects.map((project, index) => {
    const id = String(210 + index).padStart(3, "0") as BtxPageId;
    return linkTo(id, de(project.title));
  });
}

function makeExperienceLinks(): BtxLink[] {
  return siteContent.experiences.map((experience, index) => {
    const id = String(510 + index).padStart(3, "0") as BtxPageId;
    return linkTo(id, `${de(experience.title)} / ${experience.company}`);
  });
}

function projectPageId(index: number): BtxPageId {
  return String(210 + index).padStart(3, "0") as BtxPageId;
}

function experiencePageId(index: number): BtxPageId {
  return String(510 + index).padStart(3, "0") as BtxPageId;
}

function skillNames(skills: Skill[]): string[] {
  return skills.map((skill) => de(skill.name));
}

function experienceSummary(experience: Experience): string[] {
  const summary = experience.description
    .filter((item) => item.type === "text")
    .slice(0, 3)
    .map((item) => de(item.text));

  if (summary.length > 0) {
    return summary;
  }

  return experience.description.slice(0, 2).map((item) => de(item.text));
}

function relatedExperienceIds(matchers: string[]): BtxLink[] {
  const lowered = matchers.map((matcher) => matcher.toLowerCase());

  return siteContent.experiences.flatMap((experience, index) => {
    const haystack = [
      experience.company,
      de(experience.title),
      ...experience.tags.map((tag) => de(tag)),
      ...experience.description.map((item) => de(item.text)),
    ]
      .join(" ")
      .toLowerCase();

    if (!lowered.some((matcher) => haystack.includes(matcher))) {
      return [];
    }

    return [linkTo(experiencePageId(index), `${de(experience.title)} / ${experience.company}`)];
  });
}

function relatedProjectIds(matchers: string[]): BtxLink[] {
  const lowered = matchers.map((matcher) => matcher.toLowerCase());

  return siteContent.projects.flatMap((project, index) => {
    const haystack = [de(project.title), de(project.description), ...project.tags.map((tag) => de(tag))]
      .join(" ")
      .toLowerCase();

    if (!lowered.some((matcher) => haystack.includes(matcher))) {
      return [];
    }

    return [linkTo(projectPageId(index), de(project.title))];
  });
}

function buildSystemPages(): BtxPageDefinition[] {
  const titleElements = siteContent.hero.titleElements.map((entry) => de(entry));
  const aboutParagraphs = siteContent.about.paragraphs.map((entry) => de(entry));
  const projectLinks = makeProjectLinks();
  const experienceLinks = makeExperienceLinks();
  const stats = siteContent.about.stats.map((stat) => `${toUpperBtx(stat.key)} ${de(stat.value)}`);
  const socialLinks = Object.entries(siteContent.contact.socialLinks)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${toUpperBtx(key)} ${value}`);
  const currentAvailability = de(siteContent.hero.availability.currentLine).replace(
    "{percent}",
    String(siteContent.hero.availability.currentPercentAvailable),
  );
  const fullAvailability = de(siteContent.hero.availability.fullLine).replace(
    "{date}",
    siteContent.hero.availability.fullyAvailableDate,
  );

  return [
    makePage(
      "000",
      "Startseite",
      ["Start", "Uwe Schwarz", "Bildschirmtext", ...titleElements],
      [
        ...heading("btx.blue"),
        ...textLine(siteContent.hero.name),
        ...textLine(titleElements.join(" / ")),
        blank(),
        ...textLine(de(siteContent.hero.description)),
        blank(),
        ...heading("Bereiche"),
        ...linkLines([
          linkTo("100", "Über Uwe"),
          linkTo("200", "Projekte"),
          linkTo("300", "Themen"),
          linkTo("400", "Kontakt"),
          linkTo("500", "Berufserfahrung"),
          linkTo("800", "Suche / Seitenfinder"),
        ]),
        blank(),
        ...textLine(`VERFUEGBARKEIT: ${currentAvailability}`),
        ...textLine(fullAvailability, "dim"),
      ],
    ),
    makePage(
      "001",
      "Bedienhinweise",
      ["Bedienung", "Tastatur", "Navigation", "Hinweise"],
      [
        ...heading("Navigation"),
        ...textLine("Seiten werden ueber dreistellige Nummern aufgerufen."),
        ...textLine("Ziffern eingeben, ENTER druecken, Seite wird geladen."),
        blank(),
        ...bulletLines([
          "HOME springt zu 000.",
          "ZURUECK nutzt die Browser-Historie.",
          "SUCHE startet auf Seite 800.",
          "Direktlinks auf Haupt- und Folgeseiten sind moeglich.",
        ]),
        blank(),
        ...heading("Hinweis"),
        ...textLine("Dieses System ist eine browserbasierte BTX-Interpretation."),
        ...linkLines([linkTo("010", "Systemhinweise"), linkTo("900", "Ueber dieses BTX-System")]),
      ],
    ),
    makePage(
      "010",
      "Systemhinweise",
      ["System", "Hinweise", "Stand", "btx.blue"],
      [
        ...heading("Systemstand"),
        ...textLine("BTX BLUE ist statisch aufgebaut und nutzt lokale Assets."),
        ...textLine("Inhalte stammen ausschliesslich aus src/content/content.ts."),
        ...textLine("Ausgabe erfolgt ausschliesslich in deutscher Sprache."),
        blank(),
        ...heading("Aktuelle Hinweise"),
        ...bulletLines([
          "3-stellige Hauptseiten sind der primare Zugang.",
          "Lange Inhalte werden auf Folgeseiten verteilt.",
          "Die Suche auf 800 arbeitet deterministisch ohne KI.",
        ]),
        blank(),
        ...linkLines([linkTo("001", "Bedienhinweise"), linkTo("820", "Seitenuebersicht")]),
      ],
    ),
    makePage(
      "100",
      "Bereich Über Uwe",
      ["Über Uwe", "Profil", "Biografie", "Prinzipien", "Fokus"],
      [
        ...heading("Kurzuebersicht"),
        ...textLine(`${siteContent.hero.name} / ${titleElements.join(" / ")}`),
        ...textLine(stats.join("  ")),
        blank(),
        ...textLine(aboutParagraphs[0]),
        blank(),
        ...linkLines([
          linkTo("101", "Profil"),
          linkTo("102", "Kurzbiografie"),
          linkTo("103", "Schwerpunkte"),
          linkTo("104", "Arbeitsweise / Prinzipien"),
          linkTo("105", "Aktueller Fokus"),
        ]),
      ],
    ),
    makePage(
      "101",
      "Profil",
      ["Profil", "Uwe Schwarz", ...titleElements],
      [
        ...heading("Profil"),
        ...textLine(siteContent.hero.name),
        ...bulletLines(titleElements),
        blank(),
        ...textLine(de(siteContent.hero.description)),
        blank(),
        ...linkLines([linkTo("100", "Bereichsuebersicht"), linkTo("420", "Verfuegbarkeit")]),
      ],
    ),
    makePage(
      "102",
      "Kurzbiografie",
      ["Biografie", "Werdegang", "Erfahrung"],
      [
        ...heading("Kurzbiografie"),
        ...aboutParagraphs.flatMap((paragraph, index) => [...textLine(paragraph), ...(index < aboutParagraphs.length - 1 ? [blank()] : [])]),
        blank(),
        ...textLine("Ausgewaehlte Stationen:"),
        ...linkLines(experienceLinks.slice(0, 4)),
      ],
    ),
    makePage(
      "103",
      "Schwerpunkte",
      ["Schwerpunkte", "Architektur", "Security", "KI", "Infrastruktur"],
      [
        ...heading("Schwerpunkte"),
        ...bulletLines([
          "Architektur belastbarer Plattformen und Systeme",
          "Security-by-Design und regulatorische Uebersetzung",
          "Infrastruktur-Modernisierung und Betriebsfaehigkeit",
          "KI-nahe Workflows, Evaluierung und Praxisnutzen",
        ]),
        blank(),
        ...textLine(aboutParagraphs[1]),
        blank(),
        ...linkLines([linkTo("300", "Themenuebersicht"), linkTo("500", "Berufserfahrung")]),
      ],
    ),
    makePage(
      "104",
      "Arbeitsweise / Prinzipien",
      ["Arbeitsweise", "Prinzipien", "Pragmatismus", "Umsetzung"],
      [
        ...heading("Arbeitsweise"),
        ...bulletLines([
          "Technische Tiefe mit klarer Umsetzung verbinden",
          "Komplexitaet in wartbare Strukturen uebersetzen",
          "Governance mit praktischer Technik zusammenbringen",
          "Sicherheit und Betriebsfaehigkeit frueh mitdenken",
        ]),
        blank(),
        ...textLine(aboutParagraphs[1]),
        blank(),
        ...linkLines([linkTo("103", "Schwerpunkte"), linkTo("105", "Aktueller Fokus")]),
      ],
    ),
    makePage(
      "105",
      "Aktueller Fokus",
      ["Fokus", "KI", "SaaS", "Compliance", "IPv6"],
      [
        ...heading("Aktueller Fokus"),
        ...textLine(aboutParagraphs[2]),
        blank(),
        ...bulletLines([
          "KI-Workflows und agentische Orchestrierung",
          "Mandantenfaehige SaaS-Systeme",
          "Security- und Compliance-nahe Plattformen",
          "IPv6, Zero Trust und moderne Infrastruktur",
        ]),
        blank(),
        ...linkLines([linkTo("310", "KI"), linkTo("320", "Software / Plattformen"), linkTo("340", "IPv6 / Netzwerke")]),
      ],
    ),
    makePage(
      "200",
      "Projektübersicht",
      ["Projekte", "Projektverzeichnis", "Loesungen"],
      [
        ...heading("Projektverzeichnis"),
        ...textLine(de(siteContent.projectsSectionTitle)),
        blank(),
        ...linkLines(projectLinks),
        blank(),
        ...textLine(de(siteContent.moreProjects), "dim"),
      ],
    ),
    makePage(
      "300",
      "Themenübersicht",
      ["Themen", "Faehigkeiten", "Technologien"],
      [
        ...heading("Themenuebersicht"),
        ...textLine(de(siteContent.skillsSection.subtitle)),
        blank(),
        ...linkLines([
          linkTo("310", "KI"),
          linkTo("320", "Software / Web / Plattformen"),
          linkTo("330", "Infrastruktur / Cloud / Betrieb"),
          linkTo("340", "IPv6 / Netzwerke"),
          linkTo("350", "Security / Compliance / Standards"),
          linkTo("360", "Werkzeuge / Automatisierung"),
        ]),
        blank(),
        ...textLine("Sprachen: Deutsch (Muttersprache), Englisch (C2)"),
      ],
    ),
    makePage(
      "310",
      "KI",
      ["KI", "Agentische KI", "Prompt Engineering", "Governance"],
      [
        ...heading("KI"),
        ...bulletLines(skillNames(siteContent.skills.filter((skill) => skill.category === "ai"))),
        blank(),
        ...heading("Verweise"),
        ...linkLines([...relatedProjectIds(["ki", "ai", "openai", "claude"]), ...relatedExperienceIds(["ki", "ai", "openai", "claude"])]),
      ],
    ),
    makePage(
      "320",
      "Software / Web / Plattformen",
      ["Software", "Web", "Plattformen", "SaaS", "Architektur"],
      [
        ...heading("Software / Plattformen"),
        ...bulletLines(skillNames(siteContent.skills.filter((skill) => skill.category === "management")).slice(0, 8)),
        blank(),
        ...textLine("Schwerpunkte: Plattformarchitektur, SaaS, Delivery-Struktur, technische Konzepte."),
        blank(),
        ...linkLines([...relatedProjectIds(["saas", "plattform", "next.js", "compliance"]), ...relatedExperienceIds(["plattform", "software", "saas"])]),
      ],
    ),
    makePage(
      "330",
      "Infrastruktur / Cloud / Betrieb",
      ["Infrastruktur", "Cloud", "Betrieb", "Linux", "Hochverfuegbarkeit"],
      [
        ...heading("Infrastruktur / Betrieb"),
        ...bulletLines(
          skillNames(
            siteContent.skills.filter(
              (skill) =>
                skill.category === "infrastructure" &&
                !["IPv6", "TCP/IP, DNS, DHCP"].includes(de(skill.name)),
            ),
          ),
        ),
        blank(),
        ...linkLines([...relatedProjectIds(["backup", "cloud", "rubrik"]), ...relatedExperienceIds(["linux", "rechenzentrum", "backup", "cloud"])]),
      ],
    ),
    makePage(
      "340",
      "IPv6 / Netzwerke",
      ["IPv6", "Netzwerke", "DNS", "DHCP", "VPN", "Segmentierung"],
      [
        ...heading("IPv6 / Netzwerke"),
        ...bulletLines([
          "IPv6",
          "TCP/IP, DNS, DHCP",
          "Netzwerksegmentierung",
          "Zero-Config VPN",
          "Dual Stack und Migrationsplanung",
        ]),
        blank(),
        ...linkLines([...relatedProjectIds(["ipv6", "vpn", "netzwerk"]), ...relatedExperienceIds(["ipv6", "netzwerk", "segmentierung", "dns"])]),
      ],
    ),
    makePage(
      "350",
      "Security / Compliance / Standards",
      ["Security", "Compliance", "ISO27001", "SOC2", "DSGVO", "BSI"],
      [
        ...heading("Security / Compliance"),
        ...bulletLines(skillNames(siteContent.skills.filter((skill) => skill.category === "security"))),
        blank(),
        ...linkLines([...relatedProjectIds(["security", "compliance", "soc 2", "iso 27001", "dsgvo"]), ...relatedExperienceIds(["security", "compliance", "iso 27001", "soc 2", "dsgvo", "bsi"])]),
      ],
    ),
    makePage(
      "360",
      "Werkzeuge / Automatisierung",
      ["Werkzeuge", "Automatisierung", "Bash", "Python", "Git", "Codex"],
      [
        ...heading("Werkzeuge / Automatisierung"),
        ...bulletLines(skillNames(siteContent.skills.filter((skill) => skill.category === "tools"))),
        blank(),
        ...textLine("Automatisierung wird als Struktur-, Betriebs- und Delivery-Thema verstanden."),
        blank(),
        ...linkLines([...relatedProjectIds(["automatisierung", "ocr", "workflow"]), ...relatedExperienceIds(["automatisierung", "workflow", "jira", "playwright"])]),
      ],
    ),
    makePage(
      "400",
      "Kontakt",
      ["Kontakt", "E-Mail", "Telefon", "Profile", "Verfuegbarkeit"],
      [
        ...heading("Kontakt"),
        ...textLine(`${de(siteContent.contact.emailLabel)} ${siteContent.contact.email}`),
        ...textLine(`${de(siteContent.contact.phoneLabel)} ${siteContent.contact.phone}`),
        ...textLine(de(siteContent.contact.infoText)),
        blank(),
        ...linkLines([linkTo("410", "Externe Links / Profile"), linkTo("420", "Verfuegbarkeit")]),
      ],
    ),
    makePage(
      "410",
      "Externe Links / Profile",
      ["Profile", "GitHub", "LinkedIn", "Xing", "Freelancermap"],
      [
        ...heading("Profile"),
        ...bulletLines(socialLinks),
        blank(),
        ...textLine("Externe Profile sind als Referenz und Kontaktkanal verfuegbar."),
        blank(),
        ...linkLines([linkTo("400", "Kontakt"), linkTo("420", "Verfuegbarkeit")]),
      ],
    ),
    makePage(
      "420",
      "Verfügbarkeit",
      ["Verfuegbarkeit", "Kapazitaet", "Zusammenarbeit"],
      [
        ...heading("Verfuegbarkeit"),
        ...textLine(currentAvailability),
        ...textLine(fullAvailability),
        blank(),
        ...textLine(de(siteContent.contact.subtitle)),
        ...textLine("Kontakt bevorzugt per E-Mail oder Telefon."),
        blank(),
        ...linkLines([linkTo("400", "Kontakt"), linkTo("101", "Profil")]),
      ],
    ),
    makePage(
      "500",
      "Berufserfahrung",
      ["Berufserfahrung", "Stationen", "Werdegang", "Projekte"],
      [
        ...heading("Berufserfahrung"),
        ...textLine(de(siteContent.experienceBigProjectsSubtitle)),
        blank(),
        ...linkLines(experienceLinks),
        blank(),
        ...textLine(de(siteContent.experienceBigProjectsNote), "dim"),
      ],
    ),
    makePage(
      "800",
      "Suche / Seitenfinder",
      ["Suche", "Seitenfinder", "Verzeichnis", "Stichwort"],
      [
        ...heading("Seitenfinder"),
        ...textLine("Begriff eingeben. Treffer werden direkt im Raster angezeigt."),
        blank(),
        { kind: "search", text: "SUCHE:", placeholder: "STICHWORT" },
        blank(),
        { kind: "search-result", slot: 0 },
        { kind: "search-result", slot: 1 },
        { kind: "search-result", slot: 2 },
        { kind: "search-result", slot: 3 },
        { kind: "search-result", slot: 4 },
        { kind: "search-result", slot: 5 },
        { kind: "search-result", slot: 6 },
        { kind: "search-result", slot: 7 },
        blank(),
        ...linkLines([linkTo("810", "Stichwortverzeichnis"), linkTo("820", "Seitenuebersicht")]),
      ],
    ),
    makePage(
      "900",
      "Über dieses BTX-System",
      ["BTX", "Bildschirmtext", "System", "Historisch", "Browser"],
      [
        ...heading("Ueber dieses System"),
        ...textLine("BTX BLUE ist eine historisch inspirierte Seitenmaschine fuer btx.blue."),
        ...textLine("Es emuliert keine Protokolle, sondern uebersetzt Portfolio-Inhalte in ein BTX-nahes Rastermodell."),
        blank(),
        ...bulletLines([
          "40 Spalten x 24 Zeilen als Leitmodell",
          "statische Seiten mit nummerischem Zugriff",
          "deutsche Inhalte aus einer einzigen Quelle",
          "lokale Assets und reduzierte Interaktion",
        ]),
        blank(),
        ...linkLines([linkTo("001", "Bedienhinweise"), linkTo("010", "Systemhinweise")]),
      ],
    ),
  ];
}

function buildProjectPages(): BtxPageDefinition[] {
  return siteContent.projects.map((project, index) => {
    const id = projectPageId(index);
    const nextProject = siteContent.projects[index + 1];
    const nextLinks = [linkTo("200", "Projektuebersicht")];

    if (nextProject) {
      nextLinks.push(linkTo(projectPageId(index + 1), de(nextProject.title)));
    }

    const descriptionParts = splitSentences(de(project.description));

    return makePage(
      id,
      de(project.title),
      ["Projekt", de(project.title), ...project.tags.map((tag) => de(tag))],
      [
        ...heading(de(project.title)),
        ...descriptionParts.flatMap((part, sentenceIndex) => [...textLine(part), ...(sentenceIndex < descriptionParts.length - 1 ? [blank()] : [])]),
        blank(),
        ...tagLine(project.tags.map((tag) => de(tag))),
        blank(),
        ...linkLines(nextLinks),
      ],
    );
  });
}

function buildExperiencePages(): BtxPageDefinition[] {
  return siteContent.experiences.map((experience, index) => {
    const id = experiencePageId(index);
    const nextExperience = siteContent.experiences[index + 1];
    const achievements = experience.description
      .filter((item) => item.type === "achievement")
      .map((item) => de(item.text));
    const links = [linkTo("500", "Berufserfahrung")];

    if (nextExperience) {
      links.push(linkTo(experiencePageId(index + 1), `${de(nextExperience.title)} / ${nextExperience.company}`));
    }

    return makePage(
      id,
      `${de(experience.title)} / ${experience.company}`,
      ["Erfahrung", experience.company, de(experience.title), ...experience.tags.map((tag) => de(tag))],
      [
        ...heading(de(experience.title)),
        ...textLine(experience.company),
        ...textLine(`${de(experience.period)} / ${de(experience.location)}`, "dim"),
        blank(),
        ...experienceSummary(experience).flatMap((entry) => textLine(entry)),
        ...(achievements.length > 0
          ? [
              blank(),
              ...heading("Ergebnisse"),
              ...bulletLines(achievements),
            ]
          : []),
        blank(),
        ...tagLine(compactList(experience.tags.map((tag) => de(tag)), 10)),
        blank(),
        ...linkLines(links),
      ],
    );
  });
}

function buildPrivacyPage(): BtxPageDefinition {
  const lines: BtxBodyLine[] = [
    ...heading(de(siteContent.privacy.title)),
    ...textLine(de(siteContent.privacy.subtitle), "dim"),
    blank(),
  ];

  for (const section of siteContent.privacy.sections) {
    lines.push(...heading(de(section.title)));

    for (const paragraph of section.paragraphs) {
      lines.push(...textLine(de(paragraph)));
    }

    for (const item of section.list ?? []) {
      if (typeof item === "string") {
        lines.push(...textLine(`* ${item}`));
        continue;
      }

      lines.push(...textLine(`* ${de(item)}`));

      if ("description" in item && item.description) {
        lines.push(...textLine(de(item.description), "dim"));
      }
    }

    lines.push(blank());
  }

  lines.push(...linkLines([linkTo("999", "Impressum"), linkTo("400", "Kontakt")]));

  return makePage("998", de(siteContent.privacy.title), ["Datenschutz", ...siteContent.privacy.sections.map((section) => de(section.title))], lines);
}

function buildImprintPage(): BtxPageDefinition {
  return makePage(
    "999",
    de(siteContent.imprint.title),
    ["Impressum", "Kontakt", "Anschrift", "Rechtliches"],
    [
      ...heading(de(siteContent.imprint.title)),
      ...textLine(de(siteContent.imprint.companyName)),
      ...textLine(de(siteContent.imprint.address.street)),
      ...textLine(de(siteContent.imprint.address.city)),
      ...textLine(de(siteContent.imprint.address.country)),
      blank(),
      ...textLine(`${de(siteContent.imprint.emailLabel)} ${siteContent.imprint.email}`),
      ...textLine(`${de(siteContent.imprint.phoneLabel)} ${siteContent.imprint.phone}`),
      blank(),
      ...heading(de(siteContent.imprint.disclaimerTitle)),
      ...textLine(de(siteContent.imprint.disclaimer)),
      blank(),
      ...linkLines([linkTo("998", "Datenschutz"), linkTo("400", "Kontakt")]),
    ],
  );
}

function buildDirectoryPages(seedPages: BtxPageDefinition[]): BtxPageDefinition[] {
  const sortedPages = [...seedPages].sort((left, right) => left.id.localeCompare(right.id));
  const keywordPairs = sortedPages.flatMap((page) =>
    page.keywords.map((keyword) => ({
      keyword,
      page,
    })),
  );

  keywordPairs.sort((left, right) => left.keyword.localeCompare(right.keyword, "de"));

  const keywordLines = keywordPairs.flatMap(({ keyword, page }) =>
    wrapText(`${toUpperBtx(keyword)} ${page.id}`).map((line) => ({
      kind: "link" as const,
      text: line,
      route: toRoute(page.id),
      ariaLabel: `${keyword} ${page.id}`,
      tone: "success" as const,
    })),
  );

  const pageLines = sortedPages.flatMap((page) =>
    wrapText(`${page.id} ${toUpperBtx(shorten(page.title, 32))}`).map((line) => ({
      kind: "link" as const,
      text: line,
      route: toRoute(page.id),
      ariaLabel: `${page.id} ${page.title}`,
      tone: "success" as const,
    })),
  );

  return [
    makePage("810", "Stichwortverzeichnis", ["Stichwortverzeichnis", "Schlagworte", "Verzeichnis"], [...heading("Stichwortverzeichnis"), blank(), ...keywordLines]),
    makePage("820", "Seitenübersicht", ["Seitenübersicht", "Inhaltsverzeichnis"], [...heading("Seitenuebersicht"), blank(), ...pageLines]),
  ];
}

export function buildPageDefinitions(): BtxPageDefinition[] {
  const seedPages = [
    ...buildSystemPages(),
    ...buildProjectPages(),
    ...buildExperiencePages(),
    buildPrivacyPage(),
    buildImprintPage(),
  ];

  const directoryPages = buildDirectoryPages(seedPages);
  return [...seedPages, ...directoryPages].sort((left, right) => left.id.localeCompare(right.id));
}
