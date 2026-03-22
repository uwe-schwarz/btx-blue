export type BtxPageId = `${number}${number}${number}`;

export interface BtxRoute {
  page: BtxPageId;
  subpage?: number;
}

export interface BtxLink {
  page: BtxPageId;
  label: string;
  description?: string;
  subpage?: number;
  route: string;
}

export type BtxBodyLine =
  | {
      kind: "text";
      text: string;
      tone?: "default" | "accent" | "dim" | "success" | "warning";
    }
  | {
      kind: "link";
      text: string;
      route: string;
      tone?: "default" | "accent" | "success";
      ariaLabel?: string;
    }
  | {
      kind: "search";
      text: string;
      placeholder: string;
    }
  | {
      kind: "search-result";
      slot: number;
    }
  | {
      kind: "blank";
    };

export interface BtxPageDefinition {
  id: BtxPageId;
  title: string;
  keywords: string[];
  lines: BtxBodyLine[];
}

export interface BtxRenderedPage {
  id: BtxPageId;
  title: string;
  keywords: string[];
  subpage: number;
  route: string;
  headerLines: [string, string, string];
  bodyLines: BtxBodyLine[];
  statusHint: string;
  nextRoute?: string;
  prevRoute?: string;
  homeRoute: string;
}

export interface SearchEntry {
  route: string;
  page: BtxPageId;
  subpage?: number;
  title: string;
  keywords: string[];
  excerpt: string;
}
