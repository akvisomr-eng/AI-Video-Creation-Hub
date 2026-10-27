import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authConfigured = Boolean(process.env.NEON_AUTH_BASE_URL) && (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) >= 32;
  const checks: Record<string, string> = {
    app: "ok",
    database: "not_configured",
    auth: authConfigured ? "configured" : "not_configured",
    imageProvider: process.env.IMAGE_PROVIDER_API_KEY ? "configured" : "not_configured",
    videoProvider: process.env.VIDEO_PROVIDER_API_KEY ? "configured" : "not_configured",
    ttsProvider: process.env.TTS_PROVIDER_API_KEY ? "configured" : "not_configured",
  };

  try {
    const sql = getDb();
    await sql`select 1 as ok`;
    checks.database = "ok";
  } catch {
    checks.database = process.env.DATABASE_URL ? "error" : "not_configured";
  }

  const ready = checks.database === "ok";
  return NextResponse.json(
    { status: ready ? "ok" : "degraded", checks, note: "Provider status indicates configuration only; generation has not been end-to-end verified." },
    { status: ready ? 200 : 503 },
  );
}
