import { createNeonAuth } from "@neondatabase/auth/next/server";

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) {
    throw new Error("Neon Auth is not configured. Set NEON_AUTH_BASE_URL and a 32+ character NEON_AUTH_COOKIE_SECRET.");
  }
  return createNeonAuth({ baseUrl, cookies: { secret } });
}

export async function requireSession() {
  const { data, error } = await getAuth().getSession();
  if (error || !data?.user) return null;
  return data.user;
}
