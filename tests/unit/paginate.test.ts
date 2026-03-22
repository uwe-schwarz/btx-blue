import { describe, expect, it } from "vitest";
import { paginateLines } from "@/lib/btx/paginate";

describe("paginateLines", () => {
  it("fuellt jede Seite auf die definierte Hoehe auf", () => {
    const pages = paginateLines(
      [
        { kind: "text", text: "A" },
        { kind: "text", text: "B" },
        { kind: "text", text: "C" },
      ],
      5,
    );

    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(5);
    expect(pages[0][3]).toEqual({ kind: "blank" });
  });

  it("erstellt mehrere Seiten bei Ueberlauf", () => {
    const pages = paginateLines(
      Array.from({ length: 12 }, (_, index) => ({
        kind: "text" as const,
        text: String(index),
      })),
      5,
    );

    expect(pages).toHaveLength(3);
    expect(pages[2]).toHaveLength(5);
  });
});
