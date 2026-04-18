import {
  buildAnsiResponse,
  buildMarkdownResponse,
  canServeAgentFormatForMethod,
  getPreferredAgentFormat,
  isKnownBtxPath,
  withAgentDiscoveryHeaders,
} from "@/lib/agent-ready";

interface AstroLikeContext {
  request: Request;
  url: URL;
}

export async function handleAstroAgentRequest(context: AstroLikeContext, next: () => Promise<Response>): Promise<Response> {
  const pathname = context.url.pathname;
  const preferredFormat = canServeAgentFormatForMethod(context.request.method)
    ? getPreferredAgentFormat(context.request.headers.get("accept"), context.request.headers.get("user-agent"))
    : "html";

  if (preferredFormat !== "html" && isKnownBtxPath(pathname)) {
    return preferredFormat === "ansi" ? buildAnsiResponse(pathname) : buildMarkdownResponse(pathname);
  }

  const response = await next();
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
