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
const { build } = await import("esbuild");
execFileSync("pnpm", ["run", "check"], { stdio: "inherit" });

await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
await mkdir("dist/assets", { recursive: true });

const shared = {
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  outdir: "dist/assets",
  entryNames: "[name]-[hash]",
  chunkNames: "[name]-[hash]",
  metafile: true,
  logLevel: "info",
};
const entryUrl = (result, entry) => {
  const output = Object.entries(result.metafile.outputs).find(([, value]) => value.entryPoint === entry)?.[0];
  if (!output) throw new Error(`Missing build output for ${entry}`);
  return `/${output.replace(/^dist\//, "")}`;
};
const worklet = await build({ ...shared, entryPoints: ["src/lib/terminal/modem-worklet.ts"] });
const client = await build({
  ...shared,
  entryPoints: ["src/client.ts"],
  splitting: true,
  define: { "import.meta.env.DEV": String(process.env.WRANGLER_COMMAND === "dev") },
  plugins: [{
    name: "modem-worklet-url",
    setup(builder) {
      builder.onResolve({ filter: /\?worker&url$/ }, (args) => ({ path: args.path, namespace: "worklet-url" }));
      builder.onLoad({ filter: /.*/, namespace: "worklet-url" }, () => ({ contents: `export default ${JSON.stringify(entryUrl(worklet, "src/lib/terminal/modem-worklet.ts"))}` }));
    },
  }],
});

// Preserve source CSS and its cascade order, including the checked-in fonts.
const css = (await Promise.all(["btx", "terminal"].map((name) => readFile(`src/styles/${name}.css`, "utf8")))).join("\n");
const cssPath = `assets/site-${createHash("sha256").update(css).digest("hex").slice(0, 12)}.css`;
await writeFile(`dist/${cssPath}`, css);

const generator = await build({
  entryPoints: ["src/site/generate.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  write: false,
  absWorkingDir: resolve("."),
});
const { generateSite } = await import(`data:text/javascript;base64,${Buffer.from(generator.outputFiles[0].contents).toString("base64")}`);
await generateSite({ client: entryUrl(client, "src/client.ts"), css: `/${cssPath}` });
