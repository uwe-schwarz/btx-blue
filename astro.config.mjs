import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

function agentMarkdownDevPlugin() {
  return {
    name: "btx-agent-markdown-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const accept = req.headers.accept;

          if (!accept?.includes("text/markdown")) {
            return next();
          }

          const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
          const agentReady = await server.ssrLoadModule("/src/lib/agent-ready.ts");

          if (!agentReady.isKnownBtxPath(requestUrl.pathname)) {
            return next();
          }

          const response = agentReady.buildMarkdownResponse(requestUrl.pathname);
          res.statusCode = response.status;

          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.end(await response.text());
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  site: "https://btx.blue",
  output: "static",
  vite: {
    plugins: [agentMarkdownDevPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
