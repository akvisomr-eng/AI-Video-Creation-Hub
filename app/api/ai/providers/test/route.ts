import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";
import { generateCreativeJson, getConfiguredTextProviders } from "@/lib/ai/text-gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    if (!getConfiguredTextProviders().length) {
      return NextResponse.json({ error: "No provider in the active allowlist is configured. No request was sent." }, { status: 503 });
    }

    const sql = getDb();
    const userId = await getOrCreateAppUser(user);
    const usage = await sql`SELECT count(*)::int AS count FROM generation_jobs WHERE user_id = ${userId} AND parameters->>'purpose' = 'provider_health_test' AND created_at >= date_trunc('day', now())`;
    if (Number(usage[0]?.count ?? 0) >= 3) {
      return NextResponse.json({ error: "Provider connection test limit reached (3 per day)." }, { status: 429 });
    }

    const rows = await sql`
      INSERT INTO generation_jobs (user_id, job_type, provider, model, status, progress, prompt, parameters, max_attempts, started_at)
      VALUES (${userId}, 'campaign', 'pending', 'pending', 'processing', 10,
        'Provider connection verification', ${JSON.stringify({ purpose: "provider_health_test" })}::jsonb, 1, now())
      RETURNING id
    `;
    const jobId = String(rows[0].id);
    const started = Date.now();
    try {
      const result = await generateCreativeJson('Return only this JSON object: {"ok":true,"purpose":"provider_connection_test"}.');
      const parsed = JSON.parse(result.text) as { ok?: unknown; purpose?: unknown };
      if (parsed.ok !== true || parsed.purpose !== "provider_connection_test") throw new Error("Provider returned an unexpected response.");
      const latencyMs = Date.now() - started;
      await sql`
        UPDATE generation_jobs
        SET status = 'succeeded', progress = 100, provider = ${result.provider}, model = ${result.model},
            parameters = parameters || ${JSON.stringify({ result: parsed, latencyMs })}::jsonb,
            completed_at = now(), updated_at = now()
        WHERE id = ${jobId}::uuid
      `;
      return NextResponse.json({ ok: true, provider: result.provider, model: result.model, latencyMs });
    } catch (error) {
      const providerStatus = error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0;
      const providerCode = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
      await sql`
        UPDATE generation_jobs
        SET status = 'failed', progress = 0, error_code = ${providerCode === "provider_rate_limited" ? "provider_rate_limited" : providerStatus === 429 ? "free_daily_quota" : "provider_health_test_failed"},
            error_message = 'The selected provider did not complete the connection test.',
            completed_at = now(), updated_at = now()
        WHERE id = ${jobId}::uuid
      `;
      return NextResponse.json({ error: providerStatus === 429 && providerCode === "provider_rate_limited" ? "The free-provider per-minute limit has been reached. Retry shortly." : providerStatus === 429 ? "The free-provider daily request budget has been reached. Try again after the daily reset." : "Provider connection test failed. Check the server-side key, model allowlist, and provider quota." }, { status: providerStatus === 429 ? 429 : 502 });
    }
  } catch {
    return NextResponse.json({ error: "Could not run the provider connection test." }, { status: 500 });
  }
}
