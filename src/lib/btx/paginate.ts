import { BTX_BODY_ROWS } from "@/lib/btx/constants";
import type { BtxBodyLine } from "@/lib/btx/types";

export function paginateLines(lines: BtxBodyLine[], pageSize = BTX_BODY_ROWS): BtxBodyLine[][] {
  const pages: BtxBodyLine[][] = [];

  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return pages.map((page) => {
    const filled = [...page];

    while (filled.length < pageSize) {
      filled.push({ kind: "blank" });
    }

    return filled;
  });
}
