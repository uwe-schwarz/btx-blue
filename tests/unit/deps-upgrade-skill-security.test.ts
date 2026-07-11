import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const skillPath = ".agents/skills/deps-upgrade-autopilot/SKILL.md";

describe("dependency upgrade skill security", () => {
  it("keeps untrusted issue bodies out of agent context", async () => {
    const skill = await readFile(skillPath, "utf8");
    const section = skill.match(
      /## Follow-Up Issue Deduplication(?<body>[\s\S]*?)\n## /,
    )?.groups?.body;

    expect(section).toBeTruthy();
    expect(section).toMatch(
      /`gh issue list --state open --limit 200 --json number,title,url,labels`/,
    );
    expect(section).not.toMatch(/\bgh api\b/);
    expect(section).not.toMatch(/\bgh issue view\b/);
    expect(section).not.toMatch(/--json[^\n`]*\b(?:body|comments?)\b/);
    expect(section).toMatch(/Do not open issue URLs/i);
    expect(section).toMatch(/untrusted/i);
    expect(section).toMatch(/never[^\n]*(instruction|command)/i);
  });
});
