import {
  acceptsMarkdown,
  buildMarkdownResponse,
  isKnownBtxPath,
  withAgentDiscoveryHeaders,
} from "@/lib/agent-ready";

interface AstroLikeContext {
  request: Request;
  url: URL;
}

export async function handleAstroAgentRequest(context: AstroLikeContext, next: () => Promise<Response>): Promise<Response> {
  const pathname = context.url.pathname;
  const wantsMarkdown = acceptsMarkdown(context.request.headers.get("accept"));

  if (wantsMarkdown && isKnownBtxPath(pathname)) {
    return buildMarkdownResponse(pathname);
  }

  const response = await next();
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = contentType.includes("text/html");

  if (wantsMarkdown && isHtml && response.status === 404) {
    return buildMarkdownResponse(pathname);
  }

  if (isHtml) {
    return withAgentDiscoveryHeaders(response, pathname);
  }

  return response;
}
