import { createNeonAuth } from "@neondatabase/auth/next/server";

async function dispatch(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", request: Request) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) {
    return Response.json({ error: "Authentication is not configured on this deployment." }, { status: 503 });
  }
  const handlers = createNeonAuth({ baseUrl, cookies: { secret } }).handler();
  return handlers[method](request);
}

export const GET = (request: Request) => dispatch("GET", request);
export const POST = (request: Request) => dispatch("POST", request);
export const PUT = (request: Request) => dispatch("PUT", request);
export const DELETE = (request: Request) => dispatch("DELETE", request);
export const PATCH = (request: Request) => dispatch("PATCH", request);
