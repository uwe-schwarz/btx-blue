import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://btx.blue",
  output: "static",

  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },

  adapter: cloudflare(),
});