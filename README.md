# BTX Blue

Personal BTX portfolio at [btx.blue](https://btx.blue), hosted on Cloudflare.

The frontend is prebuilt static files, including the interactive 3D desk and audio. A small Cloudflare Worker handles Markdown/ANSI responses and HTTP headers.

Rolldown bundles the browser code, lazy-loaded 3D scene and modem AudioWorklet, and builds the static page generator. TypeScript checks run separately before bundling.

Numeric BTX HTML routes use slashless URLs, matching navigation, canonical links and the sitemap. Cloudflare redirects trailing-slash and explicit index variants to those URLs. `/000` remains the BTX home alias; Markdown and ANSI negotiation accepts both slash variants directly.

All npm dependencies update automatically to the latest stable releases at deployment, including major versions, after a one-day release delay.

Design and content remain editable. Portfolio text is kept locally in `src/content/content.ts`.
