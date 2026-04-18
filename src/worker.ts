import {
  acceptsMarkdown,
  buildMarkdownResponse,
  isKnownBtxPath,
  withAgentDiscoveryHeaders,
} from "./lib/agent-ready";

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  if (acceptsMarkdown(request.headers.get("accept")) && isKnownBtxPath(pathname)) {
    return buildMarkdownResponse(pathname);
  }

  const response = await env.ASSETS.fetch(request);
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = contentType.includes("text/html");

  if (acceptsMarkdown(request.headers.get("accept")) && isHtml && response.status === 404) {
    return buildMarkdownResponse(pathname);
  }

  if (isHtml) {
    return withAgentDiscoveryHeaders(response, pathname);
  }

  return response;
}

export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
