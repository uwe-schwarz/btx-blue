import { afterEach, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe.each(["success", "fail"])("Healthchecks %s transport", (terminal) => {
  test("sends valid curl configuration once per lifecycle event without exposing the URL in arguments", () => {
    const directory = mkdtempSync(join(tmpdir(), "btx-healthcheck-"));
    temporaryDirectories.push(directory);
    const capture = join(directory, "calls.jsonl");
    // Exercise the real subprocess transport, but replace curl with a local recorder.
    writeFileSync(join(directory, "curl"), `#!${process.execPath}\nconst fs = require("node:fs");\nfs.appendFileSync(process.env.HC_TEST_CAPTURE, JSON.stringify({args: process.argv.slice(2), input: fs.readFileSync(0, "utf8")}) + "\\n");\n`, { mode: 0o700 });
    const env = {
      ...process.env,
      PATH: directory + delimiter + process.env.PATH,
      HEALTHCHECKS_PING_URL: "https://example.invalid/existing-check",
      HC_TEST_CAPTURE: capture,
    };
    const run = (action: string) => execFileSync(process.execPath, [resolve("scripts/deps-healthcheck.mjs"), action, join(directory, "state.json")], { env, stdio: "pipe" });
    run("start");
    run(terminal);
    expect(() => run(terminal)).toThrow();
    const calls = readFileSync(capture, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { args: string[]; input: string });
    expect(calls).toHaveLength(2);
    const urls = calls.map((call) => {
      expect(call.args).toEqual(["--config", "-", "--silent", "--fail", "--request", "POST", "--connect-timeout", "3", "--max-time", "15", "--output", "/dev/null"]);
      const match = call.input.match(/^url = (.+)\n$/);
      expect(match).not.toBeNull();
      return new URL(JSON.parse(match![1]));
    });
    expect(urls[0].pathname).toBe("/existing-check/start");
    expect(urls[1].pathname).toBe(terminal === "success" ? "/existing-check" : "/existing-check/fail");
    expect(urls[0].searchParams.get("rid")).toBeTruthy();
    expect(urls[1].searchParams.get("rid")).toBe(urls[0].searchParams.get("rid"));
  });
});
