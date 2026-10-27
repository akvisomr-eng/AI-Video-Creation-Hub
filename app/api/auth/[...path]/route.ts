import { createNeonAuth } from "@neondatabase/auth/next/server";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function dispatch(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  request: Request,
  context: AuthRouteContext,
) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) {
    return Response.json({ error: "Authentication is not configured on this deployment." }, { status: 503 });
  }
  const handlers = createNeonAuth({ baseUrl, cookies: { secret } }).handler();
  return handlers[method](request, context);
}

export const GET = (request: Request, context: AuthRouteContext) => dispatch("GET", request, context);
export const POST = (request: Request, context: AuthRouteContext) => dispatch("POST", request, context);
export const PUT = (request: Request, context: AuthRouteContext) => dispatch("PUT", request, context);
export const DELETE = (request: Request, context: AuthRouteContext) => dispatch("DELETE", request, context);
export const PATCH = (request: Request, context: AuthRouteContext) => dispatch("PATCH", request, context);
