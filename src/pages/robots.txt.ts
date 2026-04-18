import { buildRobotsTxt } from "@/lib/agent-ready";

export const prerender = true;

export function GET() {
  return new Response(buildRobotsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
