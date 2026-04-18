import {
  buildAnsiResponse,
  buildMarkdownResponse,
  getPreferredAgentFormat,
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
  const preferredFormat = getPreferredAgentFormat(request.headers.get("accept"), request.headers.get("user-agent"));

  if (preferredFormat !== "html" && isKnownBtxPath(pathname)) {
    return preferredFormat === "ansi" ? buildAnsiResponse(pathname) : buildMarkdownResponse(pathname);
  }

  const response = await env.ASSETS.fetch(request);
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = contentType.includes("text/html");

  if (preferredFormat !== "html" && isHtml && response.status === 404) {
    return preferredFormat === "ansi" ? buildAnsiResponse(pathname) : buildMarkdownResponse(pathname);
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
