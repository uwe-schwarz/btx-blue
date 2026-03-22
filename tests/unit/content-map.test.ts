import { describe, expect, it } from "vitest";
import { de } from "@/lib/btx/helpers";
import { buildPageDefinitions } from "@/lib/btx/content-map";

describe("de-Extraktion und Mapping", () => {
  it("verwendet ausschliesslich den deutschen String", () => {
    expect(de({ de: "Deutsch", en: "English" })).toBe("Deutsch");
  });

  it("enthaelt keine offensichtlichen englischen UI-Reste in den BTX-Seiten", () => {
    const joined = buildPageDefinitions()
      .flatMap((page) => [
        page.title,
        ...page.lines.flatMap((line) => ("text" in line ? [line.text] : [])),
      ])
      .join(" ");

    expect(joined).not.toContain("Back to Home");
    expect(joined).not.toContain("Privacy Policy");
    expect(joined).not.toContain("Get In Touch");
  });
});
