import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Workers Builds also runs this command before Wrangler's deploy step.
const deploying = process.env.WORKERS_CI === "1" || ["deploy", "versions upload"].includes(process.env.WRANGLER_COMMAND);
if (deploying) {
  execFileSync("pnpm", ["run", "deps:update"], { stdio: "inherit" });
}
// Load tooling after refresh so the new build uses the resolved version.
const { rolldown } = await import("rolldown");
execFileSync("pnpm", ["run", "check"], { stdio: "inherit" });

await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
await mkdir("dist/assets", { recursive: true });

const shared = {
  platform: "browser",
  transform: { target: "es2022" },
  logLevel: "info",
};
const output = {
  format: "es",
  minify: true,
  dir: "dist/assets",
  entryFileNames: "[name]-[hash].js",
  chunkFileNames: "[name]-[hash].js",
};
/** Build to disk or memory and release Rolldown resources even if generation fails. */
async function bundle(options, outputOptions, write = true) {
  const build = await rolldown(options);
  try {
    return await build[write ? "write" : "generate"](outputOptions);
  } finally {
    await build.close();
  }
}
const entryUrl = (result, entry) => {
  const chunk = result.output.find((file) => file.type === "chunk" && file.isEntry && file.facadeModuleId === resolve(entry));
  if (!chunk) throw new Error(`Missing build output for ${entry}`);
  return `/assets/${chunk.fileName}`;
};
const worklet = await bundle({ ...shared, input: "src/lib/terminal/modem-worklet.ts" }, { ...output, codeSplitting: false });
const client = await bundle({
  ...shared,
  input: "src/client.ts",
  transform: { ...shared.transform, define: { "import.meta.env.DEV": String(process.env.WRANGLER_COMMAND === "dev") } },
  plugins: [{
    name: "modem-worklet-url",
    resolveId(source) {
      if (source === "./modem-worklet.ts?worker&url") return "\0modem-worklet-url";
    },
    load(id) {
      if (id === "\0modem-worklet-url") return `export default ${JSON.stringify(entryUrl(worklet, "src/lib/terminal/modem-worklet.ts"))}`;
    },
  }],
}, output);

// Preserve source CSS and its cascade order, including the checked-in fonts.
const css = (await Promise.all(["btx", "terminal"].map((name) => readFile(`src/styles/${name}.css`, "utf8")))).join("\n");
const cssPath = `assets/site-${createHash("sha256").update(css).digest("hex").slice(0, 12)}.css`;
await writeFile(`dist/${cssPath}`, css);

const generator = await bundle({
  input: "src/site/generate.ts",
  platform: "node",
  transform: { target: "node22" },
}, { format: "es", codeSplitting: false }, false);
const generatorChunk = generator.output.find((file) => file.type === "chunk" && file.isEntry);
if (!generatorChunk) throw new Error("Missing site generator build output");
const { generateSite } = await import(`data:text/javascript;base64,${Buffer.from(generatorChunk.code).toString("base64")}`);
await generateSite({ client: entryUrl(client, "src/client.ts"), css: `/${cssPath}` });
