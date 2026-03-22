import { describe, expect, it } from "vitest";
import { rankSearchEntries } from "@/lib/btx/search";

describe("Suche", () => {
  it("priorisiert exakte Titel- und Themen-Treffer", () => {
    const results = rankSearchEntries("ipv6");
    expect(results[0]?.page).toBe("340");
  });

  it("liefert Treffer fuer Kontakt", () => {
    const results = rankSearchEntries("kontakt");
    expect(results.some((result) => result.page === "400")).toBe(true);
  });
});
