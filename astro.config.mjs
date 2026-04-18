import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

function agentMarkdownDevPlugin() {
  return {
    name: "btx-agent-markdown-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
          const agentReady = await server.ssrLoadModule("/src/lib/agent-ready.ts");
          const accept = req.headers.accept ?? null;
          const userAgent = req.headers["user-agent"] ?? null;
          const preferredFormat = agentReady.getPreferredAgentFormat(accept, userAgent);

          if (preferredFormat === "html") {
            return next();
          }

          if (agentReady.isKnownBtxPath(requestUrl.pathname)) {
            const response =
              preferredFormat === "ansi" ? agentReady.buildAnsiResponse(requestUrl.pathname) : agentReady.buildMarkdownResponse(requestUrl.pathname);
            res.statusCode = response.status;

            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });

            res.end(await response.text());
            return;
          }

          const originalWrite = res.write.bind(res);
          const originalEnd = res.end.bind(res);
          const originalWriteHead = res.writeHead.bind(res);
          const chunks = [];

          res.writeHead = function interceptedWriteHead(statusCode, statusMessageOrHeaders, maybeHeaders) {
            this.statusCode = statusCode;

            if (typeof statusMessageOrHeaders === "string") {
              this.statusMessage = statusMessageOrHeaders;

              if (maybeHeaders) {
                for (const [key, value] of Object.entries(maybeHeaders)) {
                  this.setHeader(key, value);
                }
              }
            } else if (statusMessageOrHeaders) {
              for (const [key, value] of Object.entries(statusMessageOrHeaders)) {
                this.setHeader(key, value);
              }
            }

            return this;
          };

          res.write = function interceptedWrite(chunk, encoding, callback) {
            if (chunk) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : undefined));
            }

            if (typeof encoding === "function") {
              encoding();
            } else if (typeof callback === "function") {
              callback();
            }

            return true;
          };

          res.end = async function interceptedEnd(chunk, encoding, callback) {
            if (chunk) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : undefined));
            }

            const contentType = String(this.getHeader("content-type") ?? "").toLowerCase();
            const isHtml = contentType.includes("text/html");
            const wantsAgent404 = this.statusCode === 404 && isHtml;

            res.write = originalWrite;
            res.end = originalEnd;
            res.writeHead = originalWriteHead;

            if (wantsAgent404) {
              const response =
                preferredFormat === "ansi" ? agentReady.buildAnsiResponse(requestUrl.pathname) : agentReady.buildMarkdownResponse(requestUrl.pathname);

              for (const headerName of res.getHeaderNames()) {
                res.removeHeader(headerName);
              }

              res.statusCode = response.status;
              res.statusMessage = response.statusText || res.statusMessage;

              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });

              return originalEnd(await response.text(), typeof encoding === "string" ? encoding : undefined, typeof callback === "function" ? callback : undefined);
            }

            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            return originalEnd(body, typeof encoding === "string" ? encoding : undefined, typeof callback === "function" ? callback : undefined);
          };

          next();
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
