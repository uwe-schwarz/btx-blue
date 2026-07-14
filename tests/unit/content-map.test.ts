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

  it("bildet die Trainings mit ihren deutschen Beschreibungen als BTX-Seiten ab", () => {
    const pages = buildPageDefinitions();
    const overview = pages.find((page) => page.id === "600");
    const haProxy = pages.find((page) => page.id === "610");
    const agenticAi = pages.find((page) => page.id === "611");

    expect(overview?.title).toBe("Trainings & Workshops");
    expect(haProxy?.title).toBe("HAProxy – Load Balancing in der Praxis");
    expect(agenticAi?.title).toBe("Agentic-AI-Workflows");

    const haProxyText = haProxy?.lines.flatMap((line) => ("text" in line ? [line.text] : [])).join(" ");
    const agenticAiText = agenticAi?.lines.flatMap((line) => ("text" in line ? [line.text] : [])).join(" ");

    expect(haProxyText).toContain("Von den Grundlagen moderner");
    expect(haProxyText).toContain("entlang realer Szenarien.");
    expect(agenticAiText).toContain("Wie aus Sprachmodellen verlässliche");
    expect(agenticAiText).toContain("mit aktuellen Frameworks.");
    expect(`${haProxyText} ${agenticAiText}`).not.toContain("From the fundamentals");
    expect(`${haProxyText} ${agenticAiText}`).not.toContain("How language models become");
  });
});
