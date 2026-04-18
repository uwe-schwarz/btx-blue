import type { LocalizedString } from "@/lib/localization";
import { SITE_URL } from "@/lib/site-config";

export type { LocalizedString } from "@/lib/localization";

interface NavItem {
  href: string;
  label: LocalizedString;
}

interface HeroSection {
  availability: HeroAvailability;
  ctaPrimary: LocalizedString;
  ctaSecondary: LocalizedString;
  description: LocalizedString;
  imageAlt: LocalizedString;
  name: string;
  scrollText: LocalizedString;
  titleElements: Array<LocalizedString>;
}

interface HeroAvailability {
  currentLine: LocalizedString;
  currentPercentAvailable: number;
  fullLine: LocalizedString;
  fullyAvailableDate: string;
  title: LocalizedString;
}

interface AboutSection {
  imageAlt: LocalizedString;
  labels: {
    experience: LocalizedString;
    projects: LocalizedString;
    technologies: LocalizedString;
  };
  paragraphs: Array<LocalizedString>;
  stats: Array<{ key: string; value: LocalizedString }>;
  title: LocalizedString;
}

interface ExperienceDescriptionItem {
  text: LocalizedString;
  type: "text" | "achievement";
}

export interface Experience {
  company: string;
  description: Array<ExperienceDescriptionItem>;
  location: LocalizedString;
  logoUrl?: string;
  period: LocalizedString;
  projectScale?: "major" | "small";
  tags: Array<LocalizedString>;
  title: LocalizedString;
}

interface Project {
  demoUrl?: string;
  description: LocalizedString;
  imageAlt: LocalizedString;
  imageUrl: string;
  repoUrl?: string;
  tags: Array<LocalizedString>;
  title: LocalizedString;
}

export interface Skill {
  category: "languages" | "management" | "security" | "infrastructure" | "tools" | "ai";
  level: number;
  name: LocalizedString;
}

interface SkillsSection {
  categories: {
    ai: LocalizedString;
    infrastructure: LocalizedString;
    languages: LocalizedString;
    management: LocalizedString;
    security: LocalizedString;
    tools: LocalizedString;
  };
  subtitle: LocalizedString;
  title: LocalizedString;
}

interface ContactSection {
  birthday?: string;
  cvemail: string;
  email: string;
  emailLabel: LocalizedString;
  findMeOn: LocalizedString;
  formLabels: {
    email: LocalizedString;
    message: LocalizedString;
    name: LocalizedString;
    send: LocalizedString;
  };
  formPlaceholders: {
    email: LocalizedString;
    message: LocalizedString;
    name: LocalizedString;
  };
  formStatus: {
    errorDescription: LocalizedString;
    errorTitle: LocalizedString;
    sending: LocalizedString;
    sentDescription: LocalizedString;
    sentTitle: LocalizedString;
    validation: {
      email: {
        de: string;
        en: string;
      };
      message: {
        de: string;
        en: string;
      };
      name: {
        de: string;
        en: string;
      };
    };
  };
  homepage?: string;
  infoText: LocalizedString;
  infoTitle: LocalizedString;
  phone: string;
  phoneLabel: LocalizedString;
  socialLinks: {
    bluesky?: string;
    freelancermap?: string;
    github?: string;
    linkedin?: string;
    x?: string;
    xing?: string;
  };
  subtitle: LocalizedString;
  title: LocalizedString;
}

interface CV {
  title: LocalizedString;
}

interface Footer {
  builtWith?: LocalizedString;
  copyright: LocalizedString;
  links: Array<NavItem>;
}

interface ImprintSection {
  address: {
    city: LocalizedString;
    country: LocalizedString;
    street: LocalizedString;
  };
  companyName: LocalizedString;
  contactInfoTitle: LocalizedString;
  contactTitle: LocalizedString;
  disclaimer: LocalizedString;
  disclaimerTitle: LocalizedString;
  email: string;
  emailLabel: LocalizedString;
  legalTitle?: LocalizedString;
  phone: string;
  phoneLabel: LocalizedString;
  registrationInfo?: LocalizedString;
  representative?: LocalizedString;
  title: LocalizedString;
  vatId?: LocalizedString;
}

interface PrivacySection {
  sections: Array<{
    list?: Array<
      | LocalizedString
      | {
          de: string;
          description?: LocalizedString;
          en: string;
        }
    >;
    paragraphs: Array<LocalizedString>;
    title: LocalizedString;
  }>;
  subtitle: LocalizedString;
  title: LocalizedString;
}

interface SitemapSection {
  description: LocalizedString;
  title: LocalizedString;
}

interface LLMSSection {
  keywords: LocalizedString;
  title: LocalizedString;
}

export interface SiteContent {
  about: AboutSection;
  backToHome: LocalizedString;
  contact: ContactSection;
  cv: CV;
  downloadResume: LocalizedString;
  experienceAchievementPrefix: LocalizedString;
  experienceBigProjectsNote: LocalizedString;
  experienceBigProjectsSubtitle: LocalizedString;
  experienceBigProjectsTitle: LocalizedString;
  experiences: Array<Experience>;
  experienceSectionTitle: LocalizedString;
  experienceSmallProjectsNote: LocalizedString;
  experienceSmallProjectsSubtitle: LocalizedString;
  experienceSmallProjectsTitle: LocalizedString;
  footer: Footer;
  hero: HeroSection;
  imprint: ImprintSection;
  llms?: LLMSSection;
  moreProjects: LocalizedString;
  navigation: Array<NavItem>;
  privacy: PrivacySection;
  projects: Array<Project>;
  projectsSectionMore?: LocalizedString;
  projectsSectionTitle: LocalizedString;
  sitemap?: SitemapSection;
  siteMetadata: {
    author: string;
    description: LocalizedString;
    title: string;
  };
  skills: Array<Skill>;
  skillsSection: SkillsSection;
  translations: {
    languageSwitch: {
      de: string;
      en: string;
    };
    themeSwitch: {
      dark: LocalizedString;
      light: LocalizedString;
    };
  };
}

export const siteContent: SiteContent = {
  /*  projectsSectionMore: { en: "View More Projects on GitHub", de: "Mehr Projekte auf GitHub ansehen" }, */
  about: {
    imageAlt: {
      de: "Illustration von Uwe in drei Rollen: oben arbeitet er am Computer mit grünem Code auf dem Bildschirm, symbolisch unterstützt von einer KI. Unten links erklärt er ein Netzwerk-Diagramm auf einem Flipchart, und unten rechts hält er eine Präsentation mit einem Fortschrittsdiagramm. Die Szenen sind durch geschwungene Linien verbunden, was den fließenden Übergang zwischen Technik, Planung und Kommunikation darstellt.",
      en: "Illustration of Uwe in three roles: at the top, he is working on a computer with green code on the screen, symbolically supported by an AI. At the bottom left, he explains a network diagram on a flipchart, and at the bottom right, he gives a presentation with a progress chart. The scenes are connected by flowing lines, representing the seamless transition between technology, planning, and communication.",
    },
    labels: {
      experience: { de: "Jahre Erfahrung", en: "Years of Experience" },
      projects: { de: "Abgeschlossene Projekte", en: "Completed Projects" },
      technologies: { de: "Technologien", en: "Technologies" },
    },
    paragraphs: [
      {
        de: "Mit über zwei Jahrzehnten praktischer Erfahrung in IT, Infrastruktur und Security entwickle ich sichere, skalierbare und langfristig tragfähige Systeme. Mein Fokus liegt auf der Architektur und Umsetzung technischer Lösungen – von Linux- und Netzwerk-Infrastrukturen über Security- und Compliance-nahe Plattformen bis hin zu moderner Software für mandantenfähige SaaS-Produkte.",
        en: "With more than two decades of hands-on experience across IT, infrastructure, and security, I build secure, scalable, and durable systems. My focus is on the architecture and implementation of technical solutions — from Linux and network infrastructure to security- and compliance-oriented platforms, as well as modern software for multi-tenant SaaS products.",
      },
      {
        de: "Ich arbeite an der Schnittstelle von technischer Tiefe und klarer Umsetzung. Ob Plattformarchitektur, Security-by-Design, Infrastrukturmodernisierung oder die Übersetzung regulatorischer Anforderungen in belastbare technische Systeme: Ich verbinde Architektur, Engineering und Pragmatismus, damit aus Komplexität funktionierende Lösungen werden.",
        en: "I work at the intersection of technical depth and clear execution. Whether it is platform architecture, security-by-design, infrastructure modernization, or translating regulatory requirements into robust technical systems, I combine architecture, engineering, and pragmatism to turn complexity into working solutions.",
      },
      {
        de: "Besonders spannend finde ich alles rund um KI. Ich beobachte das Feld nicht nur, sondern probiere neue Modelle, Tools und Workflows auch praktisch aus – von Entwicklungs- und Automatisierungsprozessen bis zu produktnahen Anwendungsfällen. Mich interessieren Lösungen, die nicht nur clever wirken, sondern in der Praxis tatsächlich nützlich, sauber gebaut und sicher betreibbar sind.",
        en: "I am especially interested in AI. I do not just follow the field — I actively experiment with new models, tools, and workflows, from development and automation processes to product-facing use cases. I am most interested in solutions that are not just clever on paper, but genuinely useful in practice, well engineered, and secure to operate.",
      },
    ],
    stats: [
      { key: "experience", value: { de: "20+", en: "20+" } },
      { key: "projects", value: { de: "30+", en: "30+" } },
      { key: "technologies", value: { de: "50+", en: "50+" } },
    ],
    title: {
      de: "Über Mich",
      en: "About Me",
    },
  },
  backToHome: { de: "Zurück zur Startseite", en: "Back to Home" },
  contact: {
    birthday: "1978-02-19",
    cvemail: "uwe.schwarz@degit.de",
    email: "mail@uweschwarz.eu",
    emailLabel: {
      de: "E-Mail an",
      en: "Email me at",
    },
    findMeOn: { de: "Finde mich auf", en: "Find me on" },
    formLabels: {
      email: { de: "E-Mail", en: "Email" },
      message: { de: "Nachricht", en: "Message" },
      name: { de: "Name", en: "Name" },
      send: { de: "Nachricht senden", en: "Send Message" },
    },
    formPlaceholders: {
      email: { de: "Deine E-Mail", en: "Your email" },
      message: { de: "Deine Nachricht", en: "Your message" },
      name: { de: "Dein Name", en: "Your name" },
    },
    formStatus: {
      errorDescription: {
        de: "Nachricht konnte nicht gesendet werden. Bitte versuche es später noch einmal.",
        en: "Failed to send message. Please try again later.",
      },
      errorTitle: { de: "Fehler", en: "Error" },
      sending: { de: "Senden...", en: "Sending..." },
      sentDescription: {
        de: "Danke für deine Nachricht. Ich werde mich bald bei dir melden.",
        en: "Thanks for reaching out. I'll get back to you soon.",
      },
      sentTitle: { de: "Nachricht gesendet!", en: "Message sent!" },
      validation: {
        email: {
          de: "Bitte gib eine gültige E-Mail-Adresse ein.",
          en: "Please enter a valid email address.",
        },
        message: {
          de: "Nachricht muss mindestens 10 Zeichen lang sein.",
          en: "Message must be at least 10 characters long.",
        },
        name: {
          de: "Name muss mindestens 2 Zeichen lang sein.",
          en: "Name must be at least 2 characters long.",
        },
      },
    },
    homepage: SITE_URL,
    infoText: {
      de: "Kontaktiere mich gerne für Zusammenarbeiten oder einfach nur für ein freundliches Hallo.",
      en: "Feel free to reach out for collaborations or just a friendly hello.",
    },
    infoTitle: { de: "Lass uns in Kontakt treten", en: "Let's Connect" },
    phone: "+49 151 64403667",
    phoneLabel: {
      de: "Telefon",
      en: "Phone",
    },
    socialLinks: {
      freelancermap: "https://www.freelancermap.de/profil/uwe-schwarz",
      github: "https://github.com/uwe-schwarz",
      linkedin: "https://www.linkedin.com/in/uwe-schwarz-282531294",
      x: "https://x.com/e38383",
      xing: "https://www.xing.com/profile/Uwe_Schwarz72",
    },
    subtitle: {
      de: "Interesse an einer Zusammenarbeit? Kontaktiere mich gerne!",
      en: "Interested in working together? Feel free to reach out!",
    },
    title: {
      de: "Kontakt aufnehmen",
      en: "Get In Touch",
    },
  },
  cv: {
    title: { de: "Lebenslauf / CV", en: "Resume / CV" },
  },
  downloadResume: { de: "Lebenslauf herunterladen", en: "Download CV" },
  experienceAchievementPrefix: { de: "Erfolg:", en: "Achievement:" },
  experienceBigProjectsNote: {
    de: "Eine kuratierte Auswahl mehrmonatiger und mehrjähriger Arbeiten; weitere Details auf Anfrage.",
    en: "A curated selection of multi-month and multi-year work; further details on request.",
  },
  experienceBigProjectsSubtitle: {
    de: "Wesentliche technische und organisatorische Engagements mit hoher Verantwortung.",
    en: "Major technical and organizational engagements with high responsibility.",
  },
  experienceBigProjectsTitle: {
    de: "Schlüsselprojekte",
    en: "Key Projects",
  },
  experiences: [
    {
      company: "DEGIT AG",
      description: [
        {
          text: {
            de: "Verantwortung auf Vorstandsebene für Informationssicherheit, Datenschutz und Compliance-Themen.",
            en: "Board-level responsibility for information security, privacy, and compliance topics.",
          },
          type: "text",
        },
        {
          text: {
            de: "Vertrauenswürdiger Ansprechpartner für Security-, Infrastruktur- und regulatorische Anforderungen in Kundenprojekten.",
            en: "Trusted advisor for security, infrastructure, and regulatory requirements across client engagements.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beitrag zu sicheren und rechtskonformen IT-Architekturen mit Fokus auf moderne Technologien wie IPv6, Zero Trust und Zero-Config-VPN-Ansätze.",
            en: "Contributed to secure and compliant IT architectures with a focus on modern technologies such as IPv6, Zero Trust, and Zero-Config VPN approaches.",
          },
          type: "text",
        },
        {
          text: {
            de: "Verbindung von Governance-Anforderungen mit praktischer technischer Umsetzung in Security- und Infrastrukturinitiativen.",
            en: "Connected governance requirements with practical technical implementation across security and infrastructure initiatives.",
          },
          type: "text",
        },
      ],
      location: { de: "Hockenheim, Deutschland", en: "Hockenheim, Germany" },
      logoUrl: "/logos/degit.png",
      period: { de: "Mai 2018 - Heute", en: "May 2018 - Present" },
      projectScale: "small",
      tags: [
        { de: "Sicherheit", en: "Security" },
        { de: "Datenschutz", en: "Privacy" },
        { de: "Microsoft 365", en: "Microsoft 365" },
        { de: "Notion", en: "Notion" },
        { de: "Cloudflare", en: "Cloudflare" },
        { de: "Resend", en: "Resend" },
        { de: "Supabase", en: "Supabase" },
        { de: "IPv6", en: "IPv6" },
        { de: "Zero Trust", en: "Zero Trust" },
        { de: "Zero-Config VPN", en: "Zero-Config VPN" },
        { de: "Governance", en: "Governance" },
        { de: "Training", en: "Training" },
        { de: "Sicherheitsbewusstsein", en: "Security Awareness" },
        { de: "Risikomanagement", en: "Risk Management" },
        { de: "Compliance", en: "Compliance" },
        { de: "EU AI Act", en: "EU AI Act" },
      ],
      title: {
        de: "Vorstandsmitglied",
        en: "Member of the Board",
      },
    },
    {
      company: "Deutsche Rentenversicherung (RP, BW)",
      description: [
        {
          text: {
            de: "Technische Programmverantwortung für die IPv6-Migration bei DRV RP und DRV BW mit Fokus auf Migrationsplanung, Umsetzungsstruktur und übergreifende technische Steuerung.",
            en: "Technical program ownership for the IPv6 migration at DRV RP and DRV BW, with a focus on migration planning, execution structure, and cross-functional technical coordination.",
          },
          type: "text",
        },
        {
          text: {
            de: "Konzeption und Einführung eines operativen Steuerungsmodells mit Dashboard, Action Board, KPI-Portfolio, Risikoregister und Entscheidungsindex zur strukturierten Übersetzung technischer Themen in belastbare Delivery-Artefakte.",
            en: "Designed and implemented an operational control model with dashboard, action board, KPI portfolio, risk register, and decision index to translate technical topics into structured delivery artifacts.",
          },
          type: "text",
        },
        {
          text: {
            de: "Koordination der technischen Vorarbeiten für Architektur und Rollout über IPv6-Adressierung, Segmentierung, Dual-Stack-Zielbild, Testlabor-Planung und teamübergreifende Abhängigkeiten hinweg.",
            en: "Coordinated technical groundwork for architecture and rollout across IPv6 addressing, segmentation, dual-stack target design, test-lab planning, and cross-team dependencies.",
          },
          type: "text",
        },
        {
          text: {
            de: "Begleitung sicherheits- und compliance-relevanter Anforderungen mit Bezug auf BSI, NIS2 und KRITIS sowie deren Überführung in nachvollziehbare Nachweise, Risiken und Management-Reporting.",
            en: "Supported security- and compliance-related requirements in the context of BSI, NIS2, and critical infrastructure, translating them into traceable evidence, risks, and management reporting.",
          },
          type: "text",
        },
        {
          text: {
            de: "Etablierung eines wiederverwendbaren Intake-to-Governance-Workflows zur systematischen Erfassung technischer Actions, Risiken, offener Punkte und Nachweisanforderungen.",
            en: "Established a reusable intake-to-governance workflow for systematically capturing technical actions, risks, open issues, and evidence requirements.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Schaffung einer operativen Baseline für die technische Programmausführung mit messbaren KPIs, klaren Verantwortlichkeiten und transparenter Entscheidungsgrundlage.",
            en: "Created an operational baseline for technical program execution with measurable KPIs, clear ownership, and transparent decision support.",
          },
          type: "achievement",
        },
      ],
      location: {
        de: "Karlsruhe & Speyer, Deutschland",
        en: "Karlsruhe & Speyer, Germany",
      },
      logoUrl: "/logos/drv.svg",
      period: { de: "Jan 2026 - Heute", en: "Jan 2026 - Today" },
      tags: [
        {
          de: "Technische Programmsteuerung",
          en: "Technical Program Leadership",
        },
        { de: "IPv6", en: "IPv6" },
        { de: "Netzwerkarchitektur", en: "Network Architecture" },
        { de: "Dual Stack", en: "Dual Stack" },
        { de: "Adressmanagement", en: "Address Management" },
        { de: "Segmentierung", en: "Network Segmentation" },
        { de: "Testlabor-Planung", en: "Test Lab Planning" },
        { de: "Rollout-Vorbereitung", en: "Rollout Preparation" },
        { de: "BSI", en: "BSI" },
        { de: "KRITIS", en: "Critical Infrastructure" },
        { de: "NIS2", en: "NIS2" },
        { de: "Compliance", en: "Compliance" },
        { de: "Risikomanagement", en: "Risk Management" },
        { de: "KPI-Management", en: "KPI Management" },
        { de: "Nachweismanagement", en: "Evidence Management" },
        { de: "Atlassian Jira", en: "Atlassian Jira" },
        { de: "Confluence", en: "Confluence" },
        { de: "Microsoft PowerPoint", en: "Microsoft PowerPoint" },
        { de: "Infoblox (IPAM)", en: "Infoblox (IPAM)" },
      ],
      title: {
        de: "Technische Programmleitung IPv6-Migration",
        en: "Technical Program Lead IPv6 Migration",
      },
    },
    {
      company: "xtensible UG (haftungsbeschränkt) & Co. KG",
      description: [
        {
          text: {
            de: "Konzeption, Architektur und Entwicklung einer mandantenfähigen Trainingsplattform für Compliance- und KI-Themen mit rollenbasierter Zugriffskontrolle und klarer Mandantenisolation.",
            en: "Designed, architected, and developed a multi-tenant training platform for compliance and AI topics with role-based access control and clear tenant isolation.",
          },
          type: "text",
        },
        {
          text: {
            de: "Umsetzung zentraler Plattformfunktionen wie Kursauslieferung, Fortschritts-Tracking, Quiz, Zuweisungen sowie Admin-Dashboards für Tenant- und User-Management.",
            en: "Implemented core platform capabilities including course delivery, progress tracking, quizzes, assignments, and admin dashboards for tenant and user management.",
          },
          type: "text",
        },
        {
          text: {
            de: "Implementierung von Security-by-Design mit Postgres Row-Level Security, Audit-Logs, Rate Limiting sowie gehärteten Authentifizierungsflüssen auf Basis von Passkeys, Magic Links, 2FA und SSO.",
            en: "Implemented security-by-design using Postgres Row-Level Security, audit logging, rate limiting, and hardened authentication flows based on passkeys, magic links, 2FA, and SSO.",
          },
          type: "text",
        },
        {
          text: {
            de: "Entwicklung manipulationserschwerter PDF-Zertifikate mit QR-Verifikation, kryptografischem Hashing und Bulk-Export-Funktionen für Audit- und Nachweisprozesse.",
            en: "Developed tamper-evident PDF certificates with QR verification, cryptographic hashing, and bulk export capabilities for audit and evidence workflows.",
          },
          type: "text",
        },
        {
          text: {
            de: "Integration von Stripe-Abrechnung inklusive Subscriptions, Customer Portal und Webhooks sowie Umsetzung tenantbasierter Lizenzmodelle und Soft-Lock-Mechanismen für Nutzungsgrenzen.",
            en: "Integrated Stripe billing including subscriptions, customer portal, and webhooks, and implemented tenant-based licensing models and soft-lock mechanisms for usage limits.",
          },
          type: "text",
        },
        {
          text: {
            de: "Technische Umsetzung mit Next.js App Router, TypeScript, Bun, Tailwind, next-intl, Neon Postgres, Resend sowie automatisierten Tests mit Vitest und Playwright.",
            en: "Built with Next.js App Router, TypeScript, Bun, Tailwind, next-intl, Neon Postgres, Resend, and automated testing with Vitest and Playwright.",
          },
          type: "text",
        },
        {
          text: {
            de: "Aufbau einer produktionsnahen SaaS-Plattform mit Fokus auf Sicherheit, Mandantenfähigkeit, Abrechenbarkeit und Auditierbarkeit.",
            en: "Built a production-grade SaaS platform focused on security, multi-tenant operation, billing readiness, and auditability.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Verknüpfung von Produktlogik, Compliance-Anforderungen und technischer Implementierung in einer konsistenten Plattformarchitektur.",
            en: "Connected product logic, compliance requirements, and technical implementation in a consistent platform architecture.",
          },
          type: "achievement",
        },
      ],
      location: { de: "Hockenheim, Deutschland", en: "Hockenheim, Germany" },
      logoUrl: "/logos/schlaufabrik.png",
      period: { de: "Dezember 2025 - Heute", en: "December 2025 - Present" },
      projectScale: "small",
      tags: [
        { de: "SaaS", en: "SaaS" },
        { de: "Multi-Tenant", en: "Multi-tenant" },
        { de: "Compliance", en: "Compliance" },
        { de: "KI-Training", en: "AI Training" },
        { de: "RBAC", en: "RBAC" },
        { de: "Postgres RLS", en: "Postgres RLS" },
        { de: "Authentication", en: "Authentication" },
        { de: "Audit-Logs", en: "Audit Logs" },
        { de: "Stripe", en: "Stripe" },
        { de: "Next.js", en: "Next.js" },
        { de: "TypeScript", en: "TypeScript" },
        { de: "Bun", en: "Bun" },
        { de: "Tailwind", en: "Tailwind" },
        { de: "next-intl", en: "next-intl" },
        { de: "Neon Postgres", en: "Neon Postgres" },
        { de: "Vitest", en: "Vitest" },
        { de: "Playwright", en: "Playwright" },
      ],
      title: {
        de: "Lead Software Engineer – SchlauFabrik Trainingsplattform",
        en: "Lead Software Engineer – SchlauFabrik Training Platform",
      },
    },
    {
      company: "AKTion gegen Krebs gUG",
      description: [
        {
          text: {
            de: "Gründungsmitglied mit Verantwortung für Datenschutz und DSGVO-Compliance.",
            en: "Founding member with responsibility for data protection and GDPR compliance.",
          },
          type: "text",
        },
        {
          text: {
            de: "Entwicklung und Betreuung der Backend-Systeme.",
            en: "Develop and maintain the organization's backend systems.",
          },
          type: "text",
        },
        {
          text: {
            de: "Konzeption und Implementierung KI-gestützter Workflows für die Fallbearbeitung.",
            en: "Design and implement AI-supported workflows for case management.",
          },
          type: "text",
        },
        {
          text: {
            de: "Verantwortlich für IT-Sicherheitsstrategie und Risikomanagement.",
            en: "Responsible for IT security strategy and risk management.",
          },
          type: "text",
        },
        {
          text: {
            de: "Aufbau eines DSGVO-konformen Datenschutzrahmens von Grund auf.",
            en: "Established GDPR-compliant data protection framework from the ground up.",
          },
          type: "text",
        },
      ],
      location: { de: "Seevetal, Deutschland", en: "Seevetal, Germany" },
      logoUrl: "/logos/aktion-gegen-krebs.png",
      period: { de: "Mai 2025 - Heute", en: "May 2025 - Present" },
      projectScale: "small",
      tags: [
        { de: "Datenschutz", en: "Data Protection" },
        { de: "IT-Sicherheit", en: "IT Security" },
        { de: "KI-Workflows", en: "AI Workflows" },
        { de: "Agentische KI", en: "Agentic AI" },
        { de: "Backend-Systeme", en: "Backend Systems" },
        { de: "Backup-Strategien", en: "Backup-Strategies" },
        { de: "IPv6", en: "IPv6" },
        { de: "Zero Trust", en: "Zero Trust" },
        { de: "Zero-Config VPN", en: "Zero-Config VPN" },
        { de: "Risikomanagement", en: "Risk Management" },
        { de: "Compliance", en: "Compliance" },
        { de: "Notion", en: "Notion" },
        { de: "Cloudflare", en: "Cloudflare" },
        { de: "Resend", en: "Resend" },
        { de: "Supabase", en: "Supabase" },
      ],
      title: {
        de: "Gründungsmitglied & Datenschutzbeauftragter",
        en: "Founding Member & Data Protection Officer",
      },
    },
    {
      company: "DEGIT AG",
      description: [
        {
          text: {
            de: "Konzeption und Aufbau einer internen KI-Trainingsplattform für den Unternehmenseinsatz mit Fokus auf EU-AI-Act-Compliance und praxisnahe Befähigung der Teams.",
            en: "Design and implementation of an internal AI training platform for corporate use, focusing on compliance with the EU AI Act and practical enablement of teams.",
          },
          type: "text",
        },
        {
          text: {
            de: "Bewertung und Entscheidungsvorlage zum Vergleich führender KI- und Automatisierungsplattformen hinsichtlich Datenschutz, Zuverlässigkeit, API-Integration und Governance-Tauglichkeit.",
            en: "Evaluation and decision paper comparing leading AI and automation platforms with regard to data protection, reliability, API integration and governance readiness.",
          },
          type: "text",
        },
        {
          text: {
            de: "Evaluierung aufkommender agentischer KI-Workflows zur mehrstufigen Aufgabenorchestrierung und deren Integration in Unternehmensautomatisierungsumgebungen.",
            en: "Evaluation of emerging Agentic AI workflows for multi-step task orchestration and their integration into enterprise automation environments.",
          },
          type: "text",
        },
        {
          text: {
            de: "Analysiert und bewertet: OpenAI ChatGPT, OpenAI Open-Weight GPT-OSS, Microsoft Copilot, Perplexity, Anthropic Claude, Apple Foundation, z.AI GLM, n8n, make.com und Zapier.",
            en: "Analyzed and benchmarked: OpenAI ChatGPT, OpenAI Open-Weight GPT-OSS, Microsoft Copilot, Perplexity, Anthropic Claude, Apple Foundation, z.AI GLM, n8n, make.com, Zapier.",
          },
          type: "text",
        },
      ],
      location: { de: "Hockenheim, Deutschland", en: "Hockenheim, Germany" },
      logoUrl: "/logos/degit.png",
      period: { de: "Aug 2025 – Okt 2025", en: "Aug 2025 – Oct 2025" },
      projectScale: "small",
      tags: [
        { de: "KI-Evaluierung", en: "AI Evaluation" },
        { de: "KI-Training", en: "AI Training" },
        { de: "EU AI Act", en: "EU AI Act" },
        { de: "Supabase", en: "Supabase" },
        { de: "Cloudflare", en: "Cloudflare" },
        { de: "Automatisierung", en: "Automation" },
        { de: "n8n", en: "n8n" },
        { de: "make.com", en: "make.com" },
        { de: "Zapier", en: "Zapier" },
        { de: "OpenAI", en: "OpenAI" },
        { de: "Apple Foundation", en: "Apple Foundation" },
        { de: "Anthropic Claude", en: "Anthropic Claude" },
        { de: "Microsoft Copilot", en: "Microsoft Copilot" },
        { de: "Perplexity", en: "Perplexity" },
        { de: "z.AI GLM", en: "z.AI GLM" },
        { de: "Agentische KI", en: "Agentic AI" },
        { de: "Unternehmensautomatisierung", en: "Enterprise Automation" },
        { de: "Cursor", en: "Cursor" },
        { de: "Claude Code", en: "Claude Code" },
        { de: "OpenAI Codex", en: "OpenAI Codex" },
      ],
      title: {
        de: "KI-Trainingsplattform & Evaluierung von KI-Werkzeugen",
        en: "AI Training Platform & AI Tools Evaluation",
      },
    },
    {
      company: "Joh. Berenberg, Gossler & Co. KG",
      description: [
        {
          text: {
            de: "Technische Teilprojektverantwortung im Rahmen der Rechenzentrumsmigration mit Schwerpunkt auf Solaris-, Linux-, Storage- und Backup-Umgebungen.",
            en: "Technical subproject ownership within the data center migration, focused on Solaris, Linux, storage, and backup environments.",
          },
          type: "text",
        },
        {
          text: {
            de: "Konzeption, Modernisierung und Einführung der unternehmensweiten Backup-Plattform auf Basis der Rubrik Security Cloud inklusive technischer Abstimmung über Betriebs-, Security- und Wiederherstellungsanforderungen hinweg.",
            en: "Designed, modernized, and implemented the enterprise backup platform based on Rubrik Security Cloud, coordinating across operations, security, and recovery requirements.",
          },
          type: "text",
        },
        {
          text: {
            de: "Mitwirkung an der Weiterentwicklung der Solaris-Infrastruktur und an der schrittweisen Ablösung von Legacy-Systemen zugunsten moderner, cloudfähiger Zielarchitekturen.",
            en: "Contributed to the evolution of the Solaris infrastructure and the phased replacement of legacy systems with modern, cloud-ready target architectures.",
          },
          type: "text",
        },
        {
          text: {
            de: "Unterstützung bei der technischen Erneuerung der Netzwerkinfrastruktur hin zu einer segmentierten, sicherheitsorientierten Architektur mit klareren Betriebs- und Schutzgrenzen.",
            en: "Supported the technical renewal of the network infrastructure toward a segmented, security-oriented architecture with clearer operational and protection boundaries.",
          },
          type: "text",
        },
        {
          text: {
            de: "Etablierung einer modernisierten Backup-Baseline mit Verbesserungen bei Datensicherheit, Compliance und Wiederherstellbarkeit über mehrere Fachbereiche hinweg.",
            en: "Established a modernized backup baseline with improved data protection, compliance, and recoverability across multiple business units.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Beitrag zur technischen Vorbereitung und koordinierten Umsetzung der Verlagerung von zwei Rechenzentren mit minimierten Ausfallzeiten und abgestimmten Infrastrukturabhängigkeiten.",
            en: "Contributed to the technical preparation and coordinated execution of the relocation of two data centers, with minimized downtime and aligned infrastructure dependencies.",
          },
          type: "achievement",
        },
      ],
      location: { de: "Hamburg, Deutschland", en: "Hamburg, Germany" },
      logoUrl: "/logos/berenberg.svg",
      period: { de: "Jan 2024 - Sep 2025", en: "Jan 2024 - Sep 2025" },
      tags: [
        {
          de: "Technische Teilprojektsteuerung",
          en: "Technical Subproject Leadership",
        },
        { de: "Rechenzentrumsmigration", en: "Data Center Migration" },
        { de: "Rubrik Security Cloud", en: "Rubrik Security Cloud" },
        { de: "Backup-Modernisierung", en: "Backup Modernization" },
        { de: "Storage", en: "Storage" },
        { de: "Solaris", en: "Solaris" },
        { de: "Linux", en: "Linux" },
        { de: "Legacy-Modernisierung", en: "Legacy Modernization" },
        { de: "Netzwerksegmentierung", en: "Network Segmentation" },
        { de: "Compliance", en: "Compliance" },
        { de: "DORA", en: "DORA" },
        { de: "Rubrik", en: "Rubrik" },
        { de: "Atlassian Jira", en: "Atlassian Jira" },
        { de: "Atlassian Confluence", en: "Atlassian Confluence" },
        { de: "Microsoft Project", en: "Microsoft Project" },
        { de: "ServiceNow", en: "ServiceNow" },
        { de: "LeanIX", en: "LeanIX" },
        { de: "Delinea", en: "Delinea" },
        { de: "IPv6", en: "IPv6" },
      ],
      title: {
        de: "Technische Teilprojektleitung RZ-Migration & Backup-Modernisierung",
        en: "Technical Subproject Lead Data Center Migration & Backup Modernization",
      },
    },
    {
      company: "Threedium Ltd.",
      description: [
        {
          text: {
            de: "Beratung und Umsetzung in den Bereichen Informationssicherheit, technische Security Controls und organisatorische Sicherheitsanforderungen.",
            en: "Advised on and implemented information security measures across technical security controls and organizational security requirements.",
          },
          type: "text",
        },
        {
          text: {
            de: "Unterstützung des DevOps-Teams bei sicherheitsrelevanten Fragestellungen, betrieblichen Hardening-Maßnahmen und der Einbettung von Security-Anforderungen in bestehende Plattform- und Deployment-Prozesse.",
            en: "Supported the DevOps team on security-related topics, operational hardening measures, and the integration of security requirements into existing platform and deployment processes.",
          },
          type: "text",
        },
        {
          text: {
            de: "Integration von Diensten in die bestehende SSO-Infrastruktur zur Vereinheitlichung von Authentifizierung, Zugriffssteuerung und Benutzerverwaltung über mehrere Plattformen hinweg.",
            en: "Integrated services into the existing SSO infrastructure to standardize authentication, access control, and user management across multiple platforms.",
          },
          type: "text",
        },
        {
          text: {
            de: "Begleitung der Audit- und Zertifizierungsvorbereitung für SOC 2 und ISO 27001 inklusive Anforderungsabgleich, Nachweisführung und Abstimmung technischer sowie organisatorischer Maßnahmen.",
            en: "Supported audit and certification readiness for SOC 2 and ISO 27001, including control mapping, evidence collection, and coordination of technical and organizational measures.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beratung zu DSGVO-Anforderungen sowie Einführung von Aufbewahrungsfristen, Datenschutzrichtlinien und zugehörigen organisatorischen Vorgaben.",
            en: "Advised on GDPR requirements and introduced retention rules, data protection policies, and related organizational controls.",
          },
          type: "text",
        },
        {
          text: {
            de: "Einführung und Weiterentwicklung von Sicherheitsrichtlinien und Basiskontrollen zur Stärkung des unternehmensweiten Sicherheitsniveaus.",
            en: "Introduced and evolved security policies and baseline controls to strengthen the organization's overall security posture.",
          },
          type: "text",
        },
        {
          text: {
            de: "Implementierung von IT-Sicherheitsmaßnahmen, die ein SOC-2-Audit ohne Beanstandungen unterstützten und damit zentrale Kundenanforderungen absicherten.",
            en: "Implemented IT security measures that supported a SOC 2 audit with zero non-conformities and helped secure key client requirements.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Integration der SSO-Infrastruktur über mehrere Plattformen hinweg mit Verbesserungen bei Sicherheit, Zugriffskonsistenz und Nutzererlebnis.",
            en: "Integrated SSO infrastructure across multiple platforms, improving security, access consistency, and user experience.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Beitrag zur erfolgreichen ISO-27001-Zertifizierung innerhalb eines engen Zeitrahmens durch die strukturierte Umsetzung von Anforderungen, Kontrollen und Nachweisen.",
            en: "Contributed to successful ISO 27001 certification within a tight timeline through structured implementation of requirements, controls, and evidence.",
          },
          type: "achievement",
        },
      ],
      location: {
        de: "London, Vereinigtes Königreich",
        en: "London, United Kingdom",
      },
      logoUrl: "/logos/threedium.svg",
      period: { de: "Okt 2023 - Jun 2024", en: "Oct 2023 - Jun 2024" },
      tags: [
        { de: "Informationssicherheit", en: "Information Security" },
        { de: "Security Controls", en: "Security Controls" },
        { de: "Security Engineering", en: "Security Engineering" },
        { de: "DevSecOps", en: "DevSecOps" },
        { de: "SSO", en: "SSO" },
        {
          de: "Identity & Access Management",
          en: "Identity & Access Management",
        },
        { de: "DSGVO", en: "GDPR" },
        { de: "ISO 27001", en: "ISO 27001" },
        { de: "SOC 2", en: "SOC 2" },
        { de: "Atlassian Jira", en: "Atlassian Jira" },
        { de: "Atlassian Confluence", en: "Atlassian Confluence" },
        { de: "Palo Alto Firewall", en: "Palo Alto Firewall" },
        { de: "Cisco", en: "Cisco" },
        { de: "VMware", en: "VMware" },
        { de: "Linux", en: "Linux" },
        { de: "Microsoft Azure", en: "Microsoft Azure" },
        { de: "Incident Response", en: "Incident Response" },
        { de: "Penetration Testing", en: "Penetration Testing" },
      ],
      title: {
        de: "Information Security Engineer & Compliance",
        en: "Information Security Engineer & Compliance",
      },
    },
    {
      company: "GEHR Datentechnik GmbH",
      description: [
        {
          text: {
            de: "Umfassendes Code-Review der bestehenden PHP-Anwendung mit strukturierter Bewertung von Findings hoher, mittlerer und niedriger Schwere.",
            en: "Comprehensive code review of the existing PHP application with a structured assessment of critical, medium and low-severity issues.",
          },
          type: "text",
        },
        {
          text: {
            de: "Erstellung eines ausführlichen Review-Papiers mit technischen Befunden, empfohlenen Maßnahmen und Priorisierung für die Entwicklungsteams.",
            en: "Creation of a detailed review document including technical findings, recommended remediation steps, and prioritization for development teams.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beratung zu Anwendungs- und Infrastruktursicherheit mit Fokus auf praxisnahe Verbesserungen, sichere Coding-Patterns und betriebliches Hardening.",
            en: "Consulting on application and infrastructure security with a focus on practical improvements, secure coding patterns and operational hardening.",
          },
          type: "text",
        },
        {
          text: {
            de: "Unterstützung während der Umsetzung zur Behebung identifizierter Probleme und zur Verbesserung der Gesamtstabilität der Anwendung.",
            en: "Support during the implementation phase to fix identified issues and improve overall application resilience.",
          },
          type: "text",
        },
      ],
      location: { de: "Mannheim, Deutschland", en: "Mannheim, Germany" },
      logoUrl: "/logos/gehr.png",
      period: { de: "Okt 2023", en: "Oct 2023" },
      projectScale: "small",
      tags: [
        { de: "Code-Review", en: "Code Review" },
        { de: "Security-Beratung", en: "Security Advisory" },
        { de: "Schwachstellenanalyse", en: "Vulnerability Analysis" },
        { de: "DSGVO", en: "GDPR" },
        { de: "OWASP", en: "OWASP" },
        { de: "Web-Sicherheit", en: "Web Security" },
        { de: "Datenschutz", en: "Data Protection" },
        { de: "Risikobewertung", en: "Risk Assessment" },
        { de: "Linux", en: "Linux" },
        { de: "PHP", en: "PHP" },
        { de: "MySQL", en: "MySQL" },
      ],
      title: {
        de: "Code-Review & Security-Beratung",
        en: "Code Review & Security Advisory",
      },
    },
    {
      company: "Deutsche Vermögensberatung AG",
      description: [
        {
          text: {
            de: "Beratung und technische Unterstützung in Informationssicherheit mit Schwerpunkt auf Server-, Netzwerk- und Infrastruktur-Security.",
            en: "Provided security consulting and technical support across information security, with a focus on server, network, and infrastructure security.",
          },
          type: "text",
        },
        {
          text: {
            de: "Unterstützung der strategischen und operativen Maßnahmen während eines größeren Sicherheitsvorfalls, einschließlich Koordination von Reaktion, Eindämmung und Wiederanlauf.",
            en: "Supported strategic and operational activities during a major security incident, including coordination of response, containment, and recovery.",
          },
          type: "text",
        },
        {
          text: {
            de: "Erstellung und Weiterentwicklung von Sicherheitsrichtlinien, technischen Konzepten und umsetzungsnahen Sicherheitsvorgaben.",
            en: "Developed and refined security policies, technical concepts, and implementation-oriented security standards.",
          },
          type: "text",
        },
        {
          text: {
            de: "Automatisierung des Schwachstellen- und Vorfallsmanagements zur strukturierten Erfassung, Priorisierung und Bearbeitung sicherheitsrelevanter Ereignisse.",
            en: "Automated vulnerability and incident management to improve structured intake, prioritization, and handling of security-relevant events.",
          },
          type: "text",
        },
        {
          text: {
            de: "Unterstützung bei Aufbau und Weiterentwicklung von IT-Architektur und Sicherheitsstrategie, insbesondere in den Bereichen Netzwerkarchitektur, Cloud-Infrastruktur und Firewall-Konzepte.",
            en: "Supported the build-out and evolution of IT architecture and security strategy, particularly in network architecture, cloud infrastructure, and firewall design.",
          },
          type: "text",
        },
        {
          text: {
            de: "Vorbereitung und fachliche Begleitung von Penetrationstests in den Bereichen Netzwerk, Cloud, Anwendungen und Active Directory.",
            en: "Prepared and supported penetration tests across network, cloud, application, and Active Directory environments.",
          },
          type: "text",
        },
        {
          text: {
            de: "Operative Verantwortung im SOC-Umfeld mit Fokus auf Sicherheitsmonitoring, Incident Response und kontinuierliche Verbesserung von Analyse- und Eskalationsprozessen.",
            en: "Held operational responsibility in the SOC environment, focusing on security monitoring, incident response, and continuous improvement of analysis and escalation processes.",
          },
          type: "text",
        },
        {
          text: {
            de: "Durchführung von Sicherheits-Audits sowie sicherheitstechnische Begleitung von Applikations- und Netzwerk-Migrationen.",
            en: "Performed security audits and provided security oversight for application and network migrations.",
          },
          type: "text",
        },
        {
          text: {
            de: "Technischer Schwerpunkt auf Linux und Netzwerken sowie ergänzende Sicherheitsberatung für Windows-, Azure- und Entwicklungsumgebungen.",
            en: "Technical focus on Linux and networking, complemented by security consulting for Windows, Azure, and application development environments.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beratung zu Datenschutz-, Audit- und Zertifizierungsanforderungen, unter anderem mit Bezug auf ISO 27001, BSI Grundschutz, NIST und MITRE.",
            en: "Advised on data protection, audit, and certification requirements, including ISO 27001, BSI baseline protection, NIST, and MITRE.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beitrag zur koordinierten Reaktion auf einen größeren Sicherheitsvorfall mit Fokus auf Schadensbegrenzung, Wiederherstellung und betriebliche Stabilisierung.",
            en: "Contributed to the coordinated response to a major security incident, with a focus on damage containment, recovery, and operational stabilization.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Entwicklung und Automatisierung eines Schwachstellenmanagement-Ansatzes mit schnelleren Reaktionszeiten und verbesserter Transparenz im Incident Handling.",
            en: "Developed and automated a vulnerability management approach, improving response times and transparency in incident handling.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Einführung von Sicherheitsrichtlinien und technischen Sicherheitsvorgaben, die als wiederverwendbare Best Practices im Unternehmen übernommen wurden.",
            en: "Implemented security policies and technical security standards that were later adopted as reusable best practices across the organization.",
          },
          type: "achievement",
        },
      ],
      location: {
        de: "Frankfurt am Main, Deutschland",
        en: "Frankfurt am Main, Germany",
      },
      logoUrl: "/logos/dvag.svg",
      period: { de: "Jan 2019 - Sep 2023", en: "Jan 2019 - Sep 2023" },
      tags: [
        { de: "Informationssicherheit", en: "Information Security" },
        { de: "Security Engineering", en: "Security Engineering" },
        { de: "Incident Response", en: "Incident Response" },
        { de: "SOC", en: "SOC" },
        { de: "Vulnerability Management", en: "Vulnerability Management" },
        { de: "Netzwerksicherheit", en: "Network Security" },
        { de: "Linux", en: "Linux" },
        { de: "Cloud Security", en: "Cloud Security" },
        { de: "Microsoft Azure", en: "Microsoft Azure" },
        { de: "Microsoft Sentinel", en: "Microsoft Sentinel" },
        { de: "Microsoft Defender", en: "Microsoft Defender" },
        { de: "Microsoft 365", en: "Microsoft 365" },
        { de: "DSGVO", en: "GDPR" },
        { de: "ISO 27001", en: "ISO 27001" },
        { de: "BSI Grundschutz", en: "BSI Baseline Protection" },
        { de: "NIST", en: "NIST" },
        { de: "MITRE", en: "MITRE" },
        { de: "ITIL", en: "ITIL" },
        { de: "Richtlinien & Standards", en: "Policies & Standards" },
        {
          de: "Atlassian Jira & Confluence",
          en: "Atlassian Jira & Confluence",
        },
        { de: "Palo Alto / Cisco", en: "Palo Alto / Cisco" },
      ],
      title: {
        de: "Security Engineer & Incident Response",
        en: "Security Engineer & Incident Response",
      },
    },
    {
      company: "Deutsche Vermögensberatung AG",
      description: [
        {
          text: {
            de: "Technische Koordination und Ressourcenplanung eines kleinen Infrastrukturteams.",
            en: "Handled technical coordination and resource planning for a small infrastructure team.",
          },
          type: "text",
        },
        {
          text: {
            de: "Verantwortungsbereich des Teams: Linux-basierte Plattformen für E-Mail, Cloud-Speicher, Lastverteilung, Proxy und DNS.",
            en: "The team’s scope covered Linux-based platforms for email, cloud storage, load balancing, proxy, and DNS.",
          },
          type: "text",
        },
        {
          text: {
            de: "Analyse, Fehlerbehebung und nachhaltige Stabilisierung komplexer E-Mail-Infrastrukturen.",
            en: "Analyzed, troubleshot, and sustainably stabilized complex email infrastructures.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beratung und technische Umsetzung in den Bereichen IPv6, Security und hochverfügbare Infrastruktursysteme.",
            en: "Provided consulting and technical implementation across IPv6, security, and highly available infrastructure systems.",
          },
          type: "text",
        },
        {
          text: {
            de: "Technische Teilprojektverantwortung für Rechenzentrumsumzug sowie Migration und Neuaufbau von Applikationen und Serverinfrastrukturen in redundanten, hochverfügbaren Zielumgebungen.",
            en: "Held technical subproject responsibility for a data center relocation, including migration and rebuild of applications and server infrastructure into redundant, highly available target environments.",
          },
          type: "text",
        },
        {
          text: {
            de: "Beitrag zur koordinierten Umsetzung eines erfolgreichen Rechenzentrumsumzugs mit abgestimmten Infrastrukturabhängigkeiten und stabiler Betriebsüberführung.",
            en: "Contributed to the coordinated execution of a successful data center relocation with aligned infrastructure dependencies and stable operational transition.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Einführung von IPv6 im Unternehmensumfeld als Beitrag zur langfristigen Modernisierung der Netzwerkinfrastruktur.",
            en: "Introduced IPv6 in the enterprise environment as part of the long-term modernization of the network infrastructure.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Verbesserung von Teamdurchsatz und Betriebsstabilität durch automatisierte Abläufe und strukturiertere Ressourcensteuerung.",
            en: "Improved team throughput and operational stability through automation and more structured resource coordination.",
          },
          type: "achievement",
        },
      ],
      location: {
        de: "Frankfurt am Main, Deutschland",
        en: "Frankfurt am Main, Germany",
      },
      logoUrl: "/logos/dvag.svg",
      period: { de: "Jul 2015 - Dez 2018", en: "Jul 2015 - Dec 2018" },
      tags: [
        { de: "Infrastruktur", en: "Infrastructure" },
        { de: "Linux", en: "Linux" },
        { de: "E-Mail-Infrastruktur", en: "Email Infrastructure" },
        { de: "Dovecot & Postfix", en: "Dovecot & Postfix" },
        { de: "IPv6", en: "IPv6" },
        { de: "Hochverfügbarkeit", en: "High Availability" },
        { de: "Lastverteilung", en: "Load Balancing" },
        { de: "Cloud-Speicher", en: "Cloud Storage" },
        { de: "Proxy", en: "Proxy" },
        { de: "DNS", en: "DNS" },
        { de: "Rechenzentrumsmigration", en: "Data Center Migration" },
        {
          de: "Atlassian Jira & Confluence",
          en: "Atlassian Jira & Confluence",
        },
        { de: "Microsoft Azure", en: "Microsoft Azure" },
      ],
      title: {
        de: "Senior Engineer Infrastruktur",
        en: "Lead Infrastructure Engineer",
      },
    },
    {
      company: "Deutsche Vermögensberatung AG",
      description: [
        {
          text: {
            de: "Systemarchitekt für die unternehmensweite E-Mail-Archivierungsplattform mit Verantwortung für Architektur, technische Weiterentwicklung und langfristige Wartbarkeit.",
            en: "System architect for the enterprise-wide email archiving platform, responsible for architecture, technical evolution, and long-term maintainability.",
          },
          type: "text",
        },
        {
          text: {
            de: "Architektur, Design und Implementierung eines rechtssicheren Archivs für mehr als 50.000 Nutzer mit unveränderbarer Aufbewahrung, Prüfbarkeit und dauerhaft tragfähigem Betrieb.",
            en: "Designed and implemented a legally compliant archive for more than 50,000 users, ensuring immutable retention, auditability, and durable operation.",
          },
          type: "text",
        },
        {
          text: {
            de: "Einführung skalierbarer Speicher- und Redundanzkonzepte sowie Monitoring, Indexierung und Volltextsuche für die effiziente Auffindbarkeit historischer Korrespondenz.",
            en: "Introduced scalable storage and redundancy concepts as well as monitoring, indexing, and full-text search for efficient retrieval of historical correspondence.",
          },
          type: "text",
        },
        {
          text: {
            de: "Enge Zusammenarbeit mit Legal-, Compliance- und Audit-Teams zur Erfüllung regulatorischer Anforderungen und langfristigen Beweissicherheit.",
            en: "Worked closely with legal, compliance, and audit teams to meet regulatory requirements and preserve long-term evidentiary integrity.",
          },
          type: "text",
        },
        {
          text: {
            de: "Zusätzliche Verantwortung in der umliegenden Mail-Infrastruktur, darunter dovecot, postfix, Linux-basierte Dienste, DNS, Proxy, Lastverteilung und Cloud-Speicher.",
            en: "Held additional responsibilities in the surrounding mail infrastructure, including dovecot, postfix, Linux-based services, DNS, proxy, load balancing, and cloud storage.",
          },
          type: "text",
        },
        {
          text: {
            de: "Bereitstellung eines stabilen, compliance-gerechten Archivsystems, das im gesamten Unternehmen täglich genutzt wurde.",
            en: "Delivered a stable, compliant archive used daily across the organization.",
          },
          type: "achievement",
        },
        {
          text: {
            de: "Etablierung zukunftssicherer Aufbewahrungsstrategien im Einklang mit strengen regulatorischen Anforderungen.",
            en: "Established future-proof retention strategies aligned with strict regulatory requirements.",
          },
          type: "achievement",
        },
      ],
      location: {
        de: "Frankfurt am Main, Deutschland",
        en: "Frankfurt am Main, Germany",
      },
      logoUrl: "/logos/dvag.svg",
      period: { de: "Jan 2013 - Jun 2015", en: "Jan 2013 - Jun 2015" },
      tags: [
        { de: "E-Mail-Archivierung", en: "Email Archiving" },
        { de: "Compliance", en: "Compliance" },
        { de: "Aufbewahrungspflichten", en: "Retention Policies" },
        { de: "dovecot", en: "dovecot" },
        { de: "postfix", en: "postfix" },
        { de: "Linux", en: "Linux" },
        { de: "Hochverfügbarkeit", en: "High Availability" },
        { de: "Monitoring", en: "Monitoring" },
        { de: "Volltextsuche", en: "Full-Text Search" },
        { de: "Indexierung", en: "Indexing" },
        { de: "Skalierbarkeit", en: "Scalability" },
        { de: "Prüfbarkeit", en: "Auditability" },
        { de: "IPv6", en: "IPv6" },
      ],
      title: {
        de: "Systemarchitekt E-Mail-Archivierung",
        en: "System Architect Email Archiving",
      },
    },
  ],
  experienceSectionTitle: { de: "Berufserfahrung", en: "Experience" },
  experienceSmallProjectsNote: {
    de: "Spezialisierte, flexible oder fokussierte Initiativen, die die Gesamtarbeit ergänzen.",
    en: "Specialized, flexible, or focused initiatives that complement the broader work.",
  },
  experienceSmallProjectsSubtitle: {
    de: "Ergänzende oder spezialisierte Projekte mit flexiblem Umfang.",
    en: "Complementary or specialized projects with flexible scope.",
  },
  experienceSmallProjectsTitle: {
    de: "Zusatz- & Schwerpunktprojekte",
    en: "Additional & Focused Projects",
  },
  footer: {
    copyright: {
      de: "© year Uwe Schwarz. Alle Rechte vorbehalten.",
      en: "© year Uwe Schwarz. All rights reserved.",
    },
    links: [
      { href: "/privacy", label: { de: "Datenschutz", en: "Privacy Policy" } },
      { href: "/imprint", label: { de: "Impressum", en: "Imprint" } },
    ],
    /*    builtWith: {
      en: "Built with modern web technologies and a passion for clean code.",
      de: "Erstellt mit modernen Web-Technologien und einer Leidenschaft für sauberen Code.",
    },*/
  },
  hero: {
    availability: {
      currentLine: {
        de: "{percent}% verfügbar",
        en: "{percent}% available",
      },
      currentPercentAvailable: 75,
      fullLine: {
        de: "100% ab {date}",
        en: "100% from {date}",
      },
      fullyAvailableDate: "2027-01-01",
      title: {
        de: "Verfügbarkeit",
        en: "Availability",
      },
    },
    ctaPrimary: {
      de: "Meine Arbeit ansehen",
      en: "See my work",
    },
    ctaSecondary: {
      de: "Lebenslauf herunterladen",
      en: "Download CV",
    },
    description: {
      de: "Ich übersetze komplexe Anforderungen in robuste, skalierbare und langfristig tragfähige Systeme. Dabei arbeite ich an der Schnittstelle von moderner Software, Plattformen, Infrastruktur und KI-nahen Workflows – mit einem klaren Fokus auf Lösungen, die technisch sauber, sicher betreibbar und in der Praxis wirklich brauchbar sind.",
      en: "I turn complex requirements into robust, scalable, and durable systems. I work at the intersection of modern software, platforms, infrastructure, and AI-adjacent workflows, with a clear focus on solutions that are technically sound, secure to operate, and genuinely useful in practice.",
    },
    imageAlt: {
      de: "Portraitfoto von Uwe Schwarz, Software-Architekt und Security-Engineer.",
      en: "Portrait photo of Uwe Schwarz, Software Architect and Security Engineer.",
    },
    name: "Uwe Schwarz",
    scrollText: {
      de: "Nach unten",
      en: "Scroll",
    },
    titleElements: [
      {
        de: "Software-Architekt",
        en: "Software Architect",
      },
      {
        de: "Security-Engineer",
        en: "Security Engineer",
      },
      {
        de: "KI-Enthusiast",
        en: "AI Enthusiast",
      },
      {
        de: "Senior Berater",
        en: "Senior Consultant",
      },
    ],
  },
  imprint: {
    /*    representative: {
      en: "Represented by: John Oldman",
      de: "Vertreten durch: John Oldman",
    },*/
    address: {
      city: {
        de: "67069 Ludwigshafen",
        en: "67069 Ludwigshafen",
      },
      country: {
        de: "Deutschland",
        en: "Germany",
      },
      street: {
        de: "Uhlandstr. 20",
        en: "Uhlandstr. 20",
      },
    },
    companyName: {
      de: "Uwe Schwarz",
      en: "Uwe Schwarz",
    },
    contactInfoTitle: {
      de: "Kontakt",
      en: "Contact",
    },
    contactTitle: {
      de: "Kontaktinformationen",
      en: "Contact Information",
    },
    disclaimer: {
      de: "Für externe Links sind ausschließlich deren Betreiber verantwortlich.",
      en: "The operators of linked websites are solely responsible for their content.",
    },
    /*    legalTitle: {
      en: "Legal Information",
      de: "Rechtliche Informationen",
    },
    vatId: {
      en: "VAT ID: DE123456789",
      de: "USt-IdNr.: DE123456789",
    },
    registrationInfo: {
      en: "Registered in the Commercial Register of the Local Court of Berlin, HRB 123456",
      de: "Eingetragen im Handelsregister des Amtsgerichts Berlin, HRB 123456",
    }, */
    disclaimerTitle: {
      de: "Haftungsausschluss",
      en: "Disclaimer",
    },
    email: "mail@uweschwarz.eu",
    emailLabel: {
      de: "E-Mail",
      en: "Email",
    },
    phone: "+49 151 64403667",
    phoneLabel: {
      de: "Telefon",
      en: "Phone",
    },
    title: {
      de: "Impressum",
      en: "Imprint",
    },
  },
  llms: {
    keywords: {
      de: "Uwe Schwarz, Software-Architekt, Security-Engineer, KI-Enthusiast, Senior Berater, Plattformarchitektur, Infrastrukturarchitektur, SaaS, Mandantenfähige Systeme, KI-Workflows, Agentische KI, Compliance-Plattformen, ISO27001, SOC2, DSGVO, NIST Framework, MITRE ATT&CK, BSI IT-Grundschutz, Security Engineering, Risikomanagement, Vulnerabilitätsmanagement, Incident Response",
      en: "Uwe Schwarz, Software Architect, Security Engineer, AI Enthusiast, Senior Consultant, Platform Architecture, Infrastructure Architecture, SaaS, Multi-tenant Systems, AI Workflows, Agentic AI, Compliance Platforms, ISO27001, SOC2, GDPR, NIST Framework, MITRE ATT&CK, BSI IT Baseline Protection, Security Engineering, Risk Management, Vulnerability Management, Incident Response",
    },
    title: {
      de: "Übersicht für AI Agents",
      en: "Overview for AI Agents",
    },
  },
  moreProjects: {
    de: "Weitere frühere Projekte oder Referenzen sind auf Anfrage verfügbar.",
    en: "More previous projects or references available upon request.",
  },
  navigation: [
    { href: "#hero", label: { de: "Start", en: "Home" } },
    { href: "#about", label: { de: "Über mich", en: "About" } },
    { href: "#experience", label: { de: "Erfahrung", en: "Experience" } },
    { href: "#projects", label: { de: "Projekte", en: "Projects" } },
    { href: "#skills", label: { de: "Fähigkeiten", en: "Skills" } },
    { href: "#contact", label: { de: "Kontakt", en: "Contact" } },
  ],
  privacy: {
    sections: [
      {
        list: [
          {
            de: "Uwe Schwarz",
            en: "Uwe Schwarz",
          },
          {
            de: "Uhlandstr. 20",
            en: "Uhlandstr. 20",
          },
          {
            de: "67069 Ludwigshafen",
            en: "67069 Ludwigshafen",
          },
          {
            de: "Deutschland",
            en: "Germany",
          },
          {
            de: "E-Mail: mail@uweschwarz.eu",
            en: "Email: mail@uweschwarz.eu",
          },
          {
            de: "Telefon: +49 151 64403667",
            en: "Phone: +49 151 64403667",
          },
        ],
        paragraphs: [
          {
            de: "Verantwortlich für die Verarbeitung personenbezogener Daten:",
            en: "Responsible for the processing of personal data:",
          },
        ],
        title: {
          de: "Verantwortliche Stelle",
          en: "Controller",
        },
      },
      {
        paragraphs: [
          {
            de: "Ein Datenschutzbeauftragter wurde nicht benannt, da dies gemäß Art. 37 DSGVO nicht erforderlich ist.",
            en: "No Data Protection Officer has been appointed, as this is not required under Art. 37 GDPR.",
          },
        ],
        title: {
          de: "Datenschutzbeauftragter",
          en: "Data Protection Officer",
        },
      },
      {
        paragraphs: [
          {
            de: "Die hier eingegebenen Daten (Name, E-Mail, Nachricht) verwenden wir ausschließlich zur Beantwortung deiner Anfrage. Rechtsgrundlage: Einwilligung und Vertragserfüllung (Art. 6 Abs. 1 lit. a & b DSGVO).",
            en: "This form processes data (name, e-mail, message) solely to reply to your request. Basis: consent / contract performance (Art. 6 GDPR lit. a & b).",
          },
        ],
        title: {
          de: "Kontaktformular",
          en: "Contact Form",
        },
      },
      {
        list: [
          {
            de: "Cloudflare: 101 Townsend St, San Francisco, CA 94107, USA<br />Cloudflare Germany GmbH: Rosental 7, c/o Mindspace, 80331 München, Germany",
            description: {
              de: "Rechtsgrundlage: berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO) zur Gewährleistung der Performance und Sicherheit der Website.<br />Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert und verarbeitet Daten gemäß dessen Grundsätzen. Details: https://www.cloudflare.com/privacypolicy/.",
              en: "Legal basis: legitimate interests (Art. 6(1)(f) GDPR) to ensure website performance and security.<br />Cloudflare is certified under the EU-U.S. Data Privacy Framework and processes data under its principles. See: https://www.cloudflare.com/privacypolicy/.",
            },
            en: "Cloudflare: 101 Townsend St, San Francisco, CA 94107, USA<br />Cloudflare Germany GmbH: Rosental 7, c/o Mindspace, 80331 München, Germany",
          },
          {
            de: "Resend: 2261 Market Street #5039, San Francisco, CA 94114, USA",
            description: {
              de: "Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), da Resend E-Mails in deinem Auftrag versendet.<br />Resend nutzt Standardvertragsklauseln (SCC) in ihrem DPA, um den Datentransfer in die USA zu legitimieren. DPA: https://resend.com/legal/dpa.",
              en: "Legal basis: performance of a contract (Art. 6(1)(b) GDPR), as Resend sends emails on your behalf.<br />Resend’s DPA includes Standard Contractual Clauses (SCC) for transfers to the US. See: https://resend.com/legal/dpa.",
            },
            en: "Resend: 2261 Market Street #5039, San Francisco, CA 94114, USA",
          },
          {
            de: "Umami Software, Inc.: 1362 42nd Ave., San Francisco, CA, 94122, USA",
            description: {
              de: "Rechtsgrundlage: berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO) zur Durchführung der Website-Analyse in datenschutzfreundlicher Weise.<br />Umami ist ein datenschutzbewusstes Web-Analytics-Tool, das in seiner Standardkonfiguration keine Cookies verwendet und keine personenbezogenen Kennungen erhebt. Details: https://umami.is/privacy.",
              en: "Legal basis: legitimate interests (Art. 6(1)(f) GDPR) to enable website-analytics in a privacy-respective way.<br />Umami is a privacy-aware web analytics tool that does not use cookies or collect personal identifiers in its standard configuration. See: https://umami.is/privacy.",
            },
            en: "Umami Software, Inc.: 1362 42nd Ave., San Francisco, CA, 94122, USA",
          },
        ],
        paragraphs: [
          {
            de: "Diese Seite wird bei Cloudflare gehostet; ich habe dort keinen direkten Zugriff auf Server-Logs oder Deine IP-Adresse. Für das Kontaktformular nutze ich Resend, um E-Mails zu versenden. Es werden nur die von Dir im Formular eingegebenen Daten weitergeleitet – weitere personenbezogene Daten werden nicht gespeichert. Umami wird für Analysen verwendet und speichert nur pseudonymisierte Daten.",
            en: "This site is hosted by Cloudflare; I do not have direct access to server logs or your IP address there. For the contact form, I use Resend to send emails. Only the data you enter into the form is forwarded – no other personal data is stored. Umami is used for analytics and stores only pseudonymous data.",
          },
          {
            de: "Log-Aufbewahrung: max. 30 Tage",
            en: "Log retention: max. 30 days",
          },
        ],
        title: {
          de: "Einsatz von Drittanbieter-Diensten",
          en: "Use of Third-Party Services",
        },
      },
      {
        paragraphs: [
          {
            de: "Cloudflare verarbeitet Daten auf Basis berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO) und ist nach dem EU-US Data Privacy Framework zertifiziert (siehe https://www.cloudflare.com/privacypolicy).",
            en: "Cloudflare processes data under legitimate interests (Art. 6(1)(f) GDPR) and is certified under the EU-US Data Privacy Framework (see https://www.cloudflare.com/privacypolicy).",
          },
          {
            de: "Resend handelt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) und nutzt Standardvertragsklauseln für Datenübermittlungen in die USA (siehe https://resend.com/legal/dpa).",
            en: "Resend acts on contract performance (Art. 6(1)(b) GDPR) and uses Standard Contractual Clauses for US transfers (see https://resend.com/legal/dpa).",
          },
        ],
        title: {
          de: "Rechtsgrundlagen & Drittlandsübermittlung",
          en: "Legal Basis & International Transfers",
        },
      },
      {
        paragraphs: [
          {
            de: "Ich verwende keine Cookies. Lediglich Deine Sprachwahl und Theme-Einstellung werden lokal im localStorage Deines Browsers gespeichert. Die Speicherung von Theme-Einstellungen und Sprachwahl im localStorage beruht auf berechtigten Interessen (Art. 6 Abs. 1 lit. f DSGVO) zur Verbesserung der Benutzererfahrung. Du kannst diese Daten jederzeit über deine Browser-Einstellungen löschen.",
            en: "I do not use cookies. Only your language choice and theme preference are stored locally in your browser’s localStorage. The storage of theme preferences and language selection in localStorage is based on legitimate interests (Art. 6(1)(f) GDPR) to enhance user experience. You can clear this at any time in your browser settings.",
          },
        ],
        title: {
          de: "Cookies und Local Storage",
          en: "Cookies and Local Storage",
        },
      },
      {
        paragraphs: [
          {
            de: "Die Seite enthält Links zu GitHub, LinkedIn, Xing, Freelancermap und X (ehemals Twitter). Da keine externen Inhalte eingebunden sind, wirst Du beim Anklicken dieser Links auf die jeweiligen Plattformen weitergeleitet, deren Datenschutzerklärungen dann gelten.",
            en: "The site contains links to GitHub, LinkedIn, Xing, Freelancermap and X (formerly Twitter). Since I embed no external content, clicking these links may transfer you to the respective platforms, whose privacy policies then apply.",
          },
        ],
        title: {
          de: "Externe Links",
          en: "External Links",
        },
      },
      {
        paragraphs: [
          {
            de: "Ich ergreife angemessene technische und organisatorische Maßnahmen, um Deine Daten vor unbefugtem Zugriff und Verlust zu schützen. Eine 100%ige Sicherheit bei der Datenübertragung im Internet kann ich jedoch nicht garantieren.",
            en: "I take reasonable technical and organizational measures to protect your data against unauthorized access and loss. However, internet-based data transmission can never be 100% secure.",
          },
          {
            de: "Technisch-organisatorische Maßnahmen: diese Seite nutzt TLS 1.3 (falls vom Browser unterstützt), Zugangskontrollen mit MFA, Pseudonymisierung/Verschlüsselung ruhender Daten und regelmäßige Sicherheitsaudits.",
            en: "Technical and Organisational Measures: this site uses TLS 1.3 (if supported by your browser), access controls with MFA, pseudonymisation/encryption at rest, and regular security audits.",
          },
        ],
        title: {
          de: "Datensicherheit",
          en: "Data Security",
        },
      },
      {
        paragraphs: [
          {
            de: "Betroffene Personen haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21) sowie Widerruf erteilter Einwilligungen (Art. 7 Abs. 3). Diese Rechte können unter mail@uweschwarz.eu geltend gemacht werden.",
            en: "Data subjects have the right to access (Art. 15), rectify (Art. 16), erase (Art. 17), restrict processing (Art. 18), data portability (Art. 20), object (Art. 21), and withdraw consent at any time (Art. 7(3)). These rights can be exercised by contacting mail@uweschwarz.eu.",
          },
        ],
        title: {
          de: "Betroffenenrechte",
          en: "Data Subject Rights",
        },
      },
      {
        paragraphs: [
          {
            de: "Du kannst dich bei einer Aufsichtsbehörde beschweren, z. B.: Landesbeauftragte für Datenschutz RLP, Hintere Bleiche 34, 55116 Mainz; Tel. 06131 8920-0; poststelle@datenschutz.rlp.de.",
            en: "You have the right to lodge a complaint with a supervisory authority, e.g.: Rhineland-Palatinate Commissioner for Data Protection, Hintere Bleiche 34, 55116 Mainz, Germany; Tel. +49 6131 8920-0; poststelle@datenschutz.rlp.de.",
          },
        ],
        title: {
          de: "Aufsichtsbehörde",
          en: "Supervisory Authority",
        },
      },
      {
        paragraphs: [
          {
            de: "Es findet keine automatisierte Entscheidungsfindung oder Profiling statt (Art. 22 DSGVO).",
            en: "No automated decision-making or profiling takes place in these processing operations (Art. 22 GDPR).",
          },
        ],
        title: {
          de: "Automatisierte Entscheidungsfindung",
          en: "Automated Decision-making",
        },
      },
      {
        paragraphs: [
          {
            de: "Ich kann diese Datenschutzerklärung jederzeit aktualisieren. Die jeweils aktuelle Version wird hier mit Datum der letzten Änderung veröffentlicht.",
            en: "I may update this Privacy Policy at any time. The current version is published here with the date of last revision.",
          },
        ],
        title: {
          de: "Änderungen dieser Datenschutzerklärung",
          en: "Changes to This Privacy Policy",
        },
      },
    ],
    subtitle: {
      de: "Letzte Aktualisierung: 02. August 2025",
      en: "Last updated: August 02, 2025",
    },
    title: {
      de: "Datenschutzerklärung",
      en: "Privacy Policy",
    },
  },
  projects: [
    {
      description: {
        de: "Konzeption und Aufbau einer modularen Schulungsplattform zum EU-Gesetz über Künstliche Intelligenz (EU AI Act). Der Kurs vermittelt in klar strukturierten Lerneinheiten mit interaktiven Folien, Audiokommentaren und integrierten Quizfragen ein fundiertes Verständnis zu Geltungsbereich, risikobasiertem Ansatz und Compliance-Auswirkungen. Die Plattform umfasst fünf Sektionen – von den Grundlagen über Governance und Risikokategorien bis hin zu Praxisanwendungen – und wurde so entwickelt, dass sie zukünftig um weitere Module zu Datenschutz, ethischer KI und technischen Umsetzungsvorgaben erweitert werden kann.",
        en: "Designed and developed a modular training platform covering the EU Artificial Intelligence Act (EU AI Act). The course provides a structured learning path with interactive slides, voice narration, and integrated quizzes to ensure a clear understanding of the regulation’s scope, risk-based framework, and compliance implications. The platform includes five sections — from fundamentals to governance, risk categories, and real-world applications — and was built with future expansion in mind to accommodate upcoming modules on data protection, ethical AI, and technical implementation guidelines.",
      },
      imageAlt: {
        de: "Screenshot der Schulungsplattform zum EU AI Act mit abgeschlossenen Modulen, Quizfragen und einer strukturierten Übersicht über Themen wie risikobasierter Ansatz, Governance und Compliance-Strategien.",
        en: "Screenshot of the EU AI Act training platform showing completed modules, quizzes, and a structured overview of sections such as risk-based approach, governance, and compliance strategies.",
      },
      imageUrl: "/projects/ai_act_training.webp",
      tags: [
        { de: "EU AI Act", en: "EU AI Act" },
        { de: "Compliance-Schulung", en: "Compliance Training" },
        { de: "KI-Governance", en: "AI Governance" },
        { de: "E-Learning", en: "E-Learning" },
        { de: "Schulungsplattform", en: "Education Platform" },
        { de: "Regulatorischer Rahmen", en: "Regulatory Framework" },
      ],
      title: {
        de: "Schulungsplattform zum EU AI Act",
        en: "EU AI Act Training Platform",
      },
    },
    {
      description: {
        de: "Architektur, Design und Implementierung einer rechtssicheren unternehmensweiten E-Mail-Archivierungslösung für mehr als 50.000 Nutzer. Das System gewährleistet die unveränderbare Aufbewahrung sämtlicher Kommunikation über mehr als 10 Jahre und erfüllt strenge regulatorische sowie prüfungsrelevante Anforderungen. Basierend auf Open-Source-Technologien wurde das Archiv auf Skalierbarkeit, Redundanz und langfristige Wartbarkeit ausgelegt. Integriertes Monitoring, Indexierung und Volltextsuche ermöglichen ein effizientes Auffinden historischer Korrespondenz.",
        en: "Designed and implemented a legally compliant enterprise-wide email archiving solution for more than 50,000 users. The system ensures immutable retention of all communication for over 10 years and meets strict regulatory and audit requirements. Based on open-source technologies, the archive was built for scalability, redundancy, and long-term maintainability. Integrated monitoring, indexing, and full-text search enable efficient retrieval of historical correspondence.",
      },
      imageAlt: {
        de: "Symbolgrafik zum rechtssicheren E-Mail-Archiv: Zu sehen sind ein E-Mail-Symbol, zwei Datenbankstapel, ein Aktenschrank, eine Uhr, ein Kalender mit der Aufschrift „10+“ sowie ein Schutzschild mit Haken. Die Illustration steht für langfristige, unveränderbare E-Mail-Aufbewahrung, Sicherheit und Compliance für über 50.000 Nutzer.",
        en: "Illustration of a legally compliant email archiving system: Includes an envelope icon, two database stacks, a filing cabinet, a clock, a calendar labeled “10+”, and a shield with a checkmark. Represents long-term, immutable email retention, security, and compliance for over 50,000 users.",
      },
      imageUrl: "/projects/mailarchive.webp",
      tags: [
        { de: "dovecot", en: "dovecot" },
        { de: "postfix", en: "postfix" },
        { de: "Linux", en: "Linux" },
        { de: "CentOS", en: "CentOS" },
        { de: "Compliance", en: "Compliance" },
        { de: "Archivierung", en: "Archiving" },
        { de: "E-Mail-Sicherheit", en: "Email Security" },
      ],
      title: {
        de: "Rechtssicheres E-Mail-Archiv",
        en: "Secure Email Archive",
      },
    },
    {
      description: {
        de: "Konzeption und Implementierung eines Systems zur Unterstützung der Bearbeitung krebsbezogener Fälle mit KI. Die Plattform integriert sichere Datenverarbeitung, strukturierte Workflows und KI-basierte Assistenz, um Fälle zu priorisieren, zu analysieren und die Fallbearbeitung zu optimieren. Dadurch werden schnellere Reaktionszeiten und eine verbesserte Qualität im Umgang mit sensiblen medizinischen und juristischen Informationen gewährleistet.",
        en: "Designed and implemented a system to support the processing of cancer-related cases using AI. The platform integrates secure data handling, structured workflows, and AI-based assistance to prioritize, analyze, and streamline case management. This ensures faster response times and improved quality in handling sensitive medical and legal information.",
      },
      imageAlt: {
        de: "Illustration zu KI-gestützten Workflows in der Fallbearbeitung: sicherer Datenspeicher, KI-Entscheidungsknoten und Fallakten, die durch eine optimierte Prozesskette laufen.",
        en: "Illustration showing AI-assisted workflows in case management: secure data vault, AI decision nodes, and case files moving through an optimized pipeline.",
      },
      imageUrl: "/projects/ai_case_management.webp",
      tags: [
        { de: "Agentischer KI-Workflow", en: "Agentic AI Workflow" },
        { de: "Fallbearbeitung", en: "Case Management" },
        { de: "Datenschutz", en: "Data Protection" },
        { de: "Automatisierung", en: "Automation" },
      ],
      title: {
        de: "KI-unterstützte Fallbearbeitung",
        en: "AI-Supported Case Management",
      },
    },
    {
      description: {
        de: "Umsetzung der Anforderungen aus SOC 2 und ISO 27001 durch Einführung von Informationssicherheitsrichtlinien, Kontrollen und Nachweisstrukturen im Einklang mit Audit- und Zertifizierungsanforderungen.",
        en: "Implemented SOC 2 and ISO 27001 compliance requirements by introducing information security policies, controls, and evidence structures aligned with audit and certification needs.",
      },
      imageAlt: {
        de: "Illustration zur Darstellung der SOC 2- und ISO 27001-Zertifizierung: Zu sehen sind ein Zertifizierungsdokument mit Häkchen bei „SOC 2“ und „ISO 27001“, ein Sicherheitsschild, ein Vorhängeschloss und ein gesichertes Datenbanksymbol. Die Grafik steht für Informationssicherheit, Compliance und revisionssichere Datenverarbeitung.",
        en: "Illustration representing SOC 2 and ISO 27001 certification: Shows a certification document with checkmarks for “SOC 2” and “ISO 27001”, a security shield, a padlock, and a secured database icon. The graphic symbolizes information security, compliance, and audit-proof data processing.",
      },
      imageUrl: "/projects/soc2_cert.webp",
      tags: [
        { de: "SOC 2", en: "SOC 2" },
        { de: "ISO 27001", en: "ISO 27001" },
        { de: "Informationssicherheit", en: "Information Security" },
        { de: "Compliance", en: "Compliance" },
      ],
      title: {
        de: "SOC 2 & ISO 27001 Zertifizierung",
        en: "SOC 2 & ISO 27001 Certification",
      },
    },
    {
      description: {
        de: "Konzeption und Aufbau eines sicheren Zero-Config-VPN-Netzes auf Basis von IPv6 als Fundament für weltweite Konnektivität. Die Lösung ermöglicht nahtlose Peer-to-Peer-Kommunikation ohne manuelle Einrichtung, NAT-Traversal oder komplexe Provisionierung, bei gleichzeitig starker Verschlüsselung und modernen Authentifizierungsmechanismen. Durch die Kombination von einfachen Regeln mit erweiterten Sicherheitskontrollen entsteht eine widerstandsfähige, skalierbare und datenschutzfreundliche Netzwerkarchitektur für verteilte Umgebungen.",
        en: "Designed and implemented a secure, zero-configuration VPN network leveraging IPv6 as the foundation for global connectivity. The solution enables seamless peer-to-peer communication without manual setup, NAT traversal, or complex provisioning, while ensuring strong encryption and modern authentication mechanisms. By combining simple rules with advanced security controls, the network architecture provides resilient, scalable, and privacy-preserving access across distributed environments.",
      },
      imageAlt: {
        de: "Symbolgrafik für ein Zero-Config-VPN: Vernetzte, geschützte Geräte, die über ein globales IPv6-Netzwerk verbunden sind, mit Schloss-Symbolen für Verschlüsselung und Auto-Config-Elementen für die nahtlose Einrichtung ohne manuelles Eingreifen.",
        en: "Illustration of a zero-configuration VPN: interconnected shielded devices connected by a global IPv6 network grid, lock icons indicating encryption, and auto-config symbols representing seamless setup without manual intervention.",
      },
      imageUrl: "/projects/zeroconfigvpn.webp",
      tags: [
        { de: "IPv6", en: "IPv6" },
        { de: "Zero-Config", en: "Zero-Config" },
        { de: "VPN", en: "VPN" },
        { de: "Verschlüsselung", en: "Encryption" },
        { de: "Authentifizierung", en: "Authentication" },
        { de: "Compliance", en: "Compliance" },
        { de: "Netzwerksicherheit", en: "Network Security" },
      ],
      title: {
        de: "Zero-Config IPv6 VPN Netzwerk",
        en: "Zero-Config IPv6 VPN Network",
      },
    },
    {
      description: {
        de: "Modernisierung der bestehenden Backup-Infrastruktur durch Implementierung von Rubriks Enterprise-Backup-Lösung, Verbesserung des Datenschutzes, Reduzierung der Wiederherstellungszeiten und Vereinfachung des Managements in hybriden Umgebungen.",
        en: "Modernized the existing backup infrastructure by implementing Rubrik's enterprise backup solution, enhancing data protection, reducing recovery times, and simplifying management across hybrid environments.",
      },
      imageAlt: {
        de: "Illustration zur Backup-Modernisierung mit Rubrik: Zu sehen sind Symbole für Cloud-Speicherung mit Sicherheitsschild, Datenbanken, ein Wiederherstellungspfeil, ein Laptop mit Integrationssymbol sowie das Rubrik-Logo. Die Grafik steht für moderne Datensicherung, schnelle Wiederherstellung und nahtlose Systemintegration.",
        en: "Illustration depicting backup modernization with Rubrik: Features icons of secure cloud storage, data stacks, a recovery arrow, a laptop with an integration symbol, and the Rubrik logo. Represents modern data protection, fast recovery, and seamless system integration.",
      },
      imageUrl: "/projects/backup_rubrik.webp",
      tags: [
        { de: "Rubrik", en: "Rubrik" },
        { de: "Backup", en: "Backup" },
        { de: "Datenschutz", en: "Data Protection" },
        { de: "Hybrid Cloud", en: "Hybrid Cloud" },
      ],
      title: {
        de: "Modernisierung der Backup-Infrastruktur mit Rubrik",
        en: "Backup Infrastructure Modernization with Rubrik",
      },
    },
    {
      description: {
        de: "Entwicklung eines privaten Systems zur Digitalisierung aller persönlichen Dokumente und Briefe mittels OCR-Technologie. Integration einer KI-gestützten Klassifizierung zur automatischen Sortierung der Dokumente in vordefinierte Kategorien für effizientes Suchen, Auffinden und Archivieren. Zusätzlich wurde eine automatisierte Auswertung implementiert, um steuerrelevante Dokumente für die Einkommensteuer zu erkennen und entsprechend zu taggen.",
        en: "Developed a private system to digitize all personal documents and letters using OCR technology. Integrated AI-based classification to automatically sort documents into predefined categories, enabling efficient search, retrieval, and archival. Additionally, implemented automated analysis to detect tax-relevant documents for income tax purposes and tag them accordingly.",
      },
      imageAlt: {
        de: "Illustration zur Dokumentenerfassung und KI-Kategorisierung: Ein Scanner, digitalisierte Dokumente, KI-Knoten, die mit Ordnersymbolen verbunden sind, sowie kategorisierte Labels wie 'Finanzen', 'Gesundheit' und 'Versicherung'. Die Grafik steht für automatisierte Dokumentenverarbeitung und intelligente Organisation.",
        en: "Illustration showing document scanning and AI classification: A scanner, digitized documents, AI nodes connecting to folder icons, and categorized labels like 'Finance', 'Health', and 'Insurance'. Represents automated document processing and intelligent organization.",
      },
      imageUrl: "/projects/ocr_ai_documents.webp",
      tags: [
        { de: "OCR", en: "OCR" },
        { de: "KI-Kategorisierung", en: "AI Categorization" },
        { de: "KI-Agent", en: "AI Agent" },
        { de: "Dokumentenverwaltung", en: "Document Management" },
        { de: "Automatisierung", en: "Automation" },
      ],
      title: {
        de: "Automatisierte Dokumentenverwaltung mit OCR und KI-Kategorisierung",
        en: "Automated Document Management with OCR and AI Categorization",
      },
    },
  ],
  projectsSectionTitle: {
    de: "Entwickelte Lösungen",
    en: "Developed Solutions",
  },
  sitemap: {
    description: {
      de: "Hier sind alle Seiten dieser Website:",
      en: "Here are all the pages on this website:",
    },
    title: {
      de: "Seitenübersicht",
      en: "Sitemap",
    },
  },
  siteMetadata: {
    author: "Uwe Schwarz",
    description: {
      de: "Portfolio von Uwe Schwarz: Software-Architekt, Security-Engineer und KI-Enthusiast",
      en: "Portfolio of Uwe Schwarz: Software Architect, Security Engineer & AI Enthusiast",
    },
    title: "Uwe Schwarz Portfolio",
  },
  skills: [
    // Security & Compliance
    {
      category: "security",
      level: 4,
      name: { de: "ISO27001", en: "ISO27001" },
    },
    {
      category: "security",
      level: 4,
      name: { de: "SOC2", en: "SOC2" },
    },
    {
      category: "security",
      level: 5,
      name: { de: "DSGVO", en: "GDPR" },
    },
    {
      category: "security",
      level: 3,
      name: { de: "NIST Framework", en: "NIST Framework" },
    },
    {
      category: "security",
      level: 4,
      name: { de: "MITRE ATT&CK", en: "MITRE ATT&CK" },
    },
    {
      category: "security",
      level: 5,
      name: { de: "BSI IT-Grundschutz", en: "BSI IT Baseline Protection" },
    },
    {
      category: "security",
      level: 5,
      name: { de: "Sicherheitsrichtlinien", en: "Security Policies" },
    },
    {
      category: "security",
      level: 3,
      name: { de: "Risikomanagement", en: "Risk Management" },
    },
    {
      category: "security",
      level: 5,
      name: { de: "Vulnerabilitätsmanagement", en: "Vulnerability Mgmt." },
    },
    {
      category: "security",
      level: 5,
      name: { de: "Incident Response", en: "Incident Response" },
    },
    {
      category: "security",
      level: 4,
      name: {
        de: "Penetrationstest-Koordination",
        en: "Penetration Test Coordination",
      },
    },
    {
      category: "security",
      level: 3,
      name: {
        de: "Proxy & Secure Web Gateways",
        en: "Proxy & Secure Web Gateways",
      },
    },

    // Infrastructure & Platforms
    {
      category: "infrastructure",
      level: 5,
      name: {
        de: "Linux: Debian, Ubuntu, RHEL",
        en: "Linux: Debian, Ubuntu, RHEL",
      },
    },
    {
      category: "infrastructure",
      level: 3,
      name: {
        de: "Unix: FreeBSD, OpenBSD, Solaris",
        en: "Unix: FreeBSD, OpenBSD, Solaris",
      },
    },
    {
      category: "infrastructure",
      level: 5,
      name: { de: "macOS", en: "macOS" },
    },
    {
      category: "infrastructure",
      level: 2,
      name: { de: "Windows Server", en: "Windows Server" },
    },
    {
      category: "infrastructure",
      level: 4,
      name: { de: "Cloudflare", en: "Cloudflare" },
    },
    {
      category: "infrastructure",
      level: 5,
      name: { de: "E-Mail", en: "Mail" },
    },
    {
      category: "infrastructure",
      level: 4,
      name: { de: "Vercel", en: "Vercel" },
    },
    {
      category: "infrastructure",
      level: 4,
      name: { de: "Supabase", en: "Supabase" },
    },
    {
      category: "infrastructure",
      level: 4,
      name: { de: "Neon PostgreSQL", en: "Neon PostgreSQL" },
    },
    {
      category: "infrastructure",
      level: 5,
      name: {
        de: "Hochverfügbarkeitssysteme",
        en: "High Availability Systems",
      },
    },
    {
      category: "infrastructure",
      level: 5,
      name: { de: "TCP/IP, DNS, DHCP", en: "TCP/IP, DNS, DHCP" },
    },
    {
      category: "infrastructure",
      level: 5,
      name: { de: "IPv6", en: "IPv6" },
    },

    // Tools & Automation
    {
      category: "tools",
      level: 5,
      name: { de: "Bash / Shell Skripte", en: "Bash / Shell Scripting" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Git", en: "Git" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Codex", en: "Codex" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Claude Code", en: "Claude Code" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Python", en: "Python" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Postfix / Dovecot", en: "Postfix / Dovecot" },
    },
    {
      category: "tools",
      level: 5,
      name: { de: "Bind / Unbound", en: "Bind / Unbound" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Squid Proxy", en: "Squid Proxy" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "HAProxy", en: "HAProxy" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Caddy", en: "Caddy" },
    },
    {
      category: "tools",
      level: 3,
      name: { de: "Puppet", en: "Puppet" },
    },
    {
      category: "tools",
      level: 4,
      name: { de: "Docker", en: "Docker" },
    },

    // Architecture & Leadership
    {
      category: "management",
      level: 5,
      name: { de: "Software-Architektur", en: "Software Architecture" },
    },
    {
      category: "management",
      level: 5,
      name: { de: "Plattformarchitektur", en: "Platform Architecture" },
    },
    {
      category: "management",
      level: 5,
      name: {
        de: "Infrastrukturarchitektur",
        en: "Infrastructure Architecture",
      },
    },
    {
      category: "management",
      level: 4,
      name: { de: "Technische Führung", en: "Technical Leadership" },
    },
    {
      category: "management",
      level: 4,
      name: { de: "Teamleitung", en: "Team Leadership" },
    },
    {
      category: "management",
      level: 3,
      name: {
        de: "Stakeholder-Kommunikation",
        en: "Stakeholder Communication",
      },
    },
    {
      category: "management",
      level: 5,
      name: { de: "Technische Konzepte", en: "Technical Concepts" },
    },
    {
      category: "management",
      level: 4,
      name: { de: "Delivery-Struktur", en: "Delivery Structure" },
    },

    // Artificial Intelligence
    {
      category: "ai",
      level: 5,
      name: { de: "KI-Workflows", en: "AI Workflows" },
    },
    {
      category: "ai",
      level: 4,
      name: { de: "Agentische KI", en: "Agentic AI" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "Evaluierung von KI-Werkzeugen", en: "AI Tool Evaluation" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "KI-Trainingsplattformen", en: "AI Training Platforms" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "Prompt Engineering", en: "Prompt Engineering" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "Multimodale KI", en: "Multimodal AI" },
    },
    {
      category: "ai",
      level: 4,
      name: { de: "Kausale KI", en: "Causal AI" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "OpenAI / ChatGPT", en: "OpenAI / ChatGPT" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "Anthropic / Claude", en: "Anthropic / Claude" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "Google / Gemini", en: "Google / Gemini" },
    },
    {
      category: "ai",
      level: 3,
      name: { de: "KI-Medienerzeugung", en: "AI Media Generation" },
    },
    {
      category: "ai",
      level: 5,
      name: { de: "KI-Ethik & Governance", en: "AI Ethics & Governance" },
    },

    // Languages
    {
      category: "languages",
      level: 5,
      name: { de: "Deutsch (Muttersprache)", en: "German (Native)" },
    },
    {
      category: "languages",
      level: 5,
      name: { de: "Englisch (C2)", en: "English (C2)" },
    },
  ],
  skillsSection: {
    categories: {
      ai: { de: "KI", en: "AI" },
      infrastructure: { de: "Infrastruktur & Plattformen", en: "Infrastructure & Platforms" },
      languages: { de: "Sprachen", en: "Languages" },
      management: {
        de: "Architektur & Führung",
        en: "Architecture & Leadership",
      },
      security: { de: "Sicherheit", en: "Security" },
      tools: { de: "Tools & DevOps", en: "Tools & DevOps" },
    },
    subtitle: {
      de: "Die Werkzeuge, auf die ich für sichere und skalierbare IT-Systeme setze",
      en: "The tools I rely on to build secure and scalable IT systems",
    },
    title: {
      de: "Fähigkeiten & Technologien",
      en: "Skills & Technologies",
    },
  },
  translations: {
    languageSwitch: {
      de: "Zu Deutsch wechseln",
      en: "Switch to English",
    },
    themeSwitch: {
      dark: {
        de: "Zum dunklen Design wechseln",
        en: "Switch to dark theme",
      },
      light: {
        de: "Zum hellen Design wechseln",
        en: "Switch to light theme",
      },
    },
  },
};
