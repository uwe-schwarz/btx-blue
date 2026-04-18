import { buildSitemapXml } from "@/lib/agent-ready";

export const prerender = true;

export function GET() {
  return new Response(buildSitemapXml(), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
