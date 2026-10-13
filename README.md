# BTX Blue

Personal BTX portfolio at [btx.blue](https://btx.blue), hosted on Cloudflare.

The frontend is prebuilt static files, including the interactive 3D desk and audio. A small Cloudflare Worker handles Markdown/ANSI responses and HTTP headers.

All npm dependencies update automatically to the latest stable releases at deployment, including major versions, after a one-day release delay.

Design and content remain editable. Portfolio text is kept locally in `src/content/content.ts`.
