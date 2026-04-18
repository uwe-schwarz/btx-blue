import { defineMiddleware } from "astro:middleware";
import { handleAstroAgentRequest } from "@/lib/astro-agent-runtime";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!import.meta.env.DEV) {
    return next();
  }

  return handleAstroAgentRequest(context, next);
});
