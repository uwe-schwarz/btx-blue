import type { LocalizedString } from "@/lib/localization";
import type { BtxLink, BtxPageId } from "@/lib/btx/types";

export function de(value: LocalizedString | string | undefined | null): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.de ?? "";
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toUpperBtx(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[–—]/g, "-")
    .toUpperCase();
}

export function toRoute(page: BtxPageId, subpage = 1): string {
  return subpage === 1 ? `/${page}` : `/${page}/${subpage}`;
}

export function linkTo(page: BtxPageId, label: string, description?: string, subpage = 1): BtxLink {
  return {
    page,
    label,
    description,
    subpage,
    route: toRoute(page, subpage),
  };
}

export function shorten(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function compactList(values: string[], maxItems: number): string[] {
  return values.slice(0, maxItems);
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
