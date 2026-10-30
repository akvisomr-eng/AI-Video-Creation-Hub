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
    geminiTextProvider: process.env.GEMINI_API_KEY ? "configured" : "not_configured",
    groqTextProvider: process.env.GROQ_API_KEY ? "configured" : "not_configured",
    cerebrasTextProvider: process.env.CEREBRAS_API_KEY ? "configured" : "not_configured",
    openrouterTextProvider: process.env.OPENROUTER_API_KEY ? "configured" : "not_configured",
    multiAgentReview: process.env.AI_MULTI_AGENT_ENABLED === "true" ? "enabled" : "disabled",
    imageProvider: process.env.IMAGE_PROVIDER_API_KEY ? "configured" : "not_configured",
    videoProvider: process.env.VIDEO_PROVIDER_API_KEY ? "configured" : "not_configured",
    ttsProvider: process.env.TTS_PROVIDER_API_KEY ? "configured" : "not_configured",
    generationQueue: process.env.GENERATION_QUEUE_ENABLED === "true" ? "enabled" : "disabled",
    objectStorage: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_REGION ? "configured" : "not_configured",
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
