import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    if (process.env.GENERATION_QUEUE_ENABLED !== "true") return NextResponse.json({ error: "Asynchronous generation is not enabled for this environment yet." }, { status: 503 });
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    const projectId = typeof input.projectId === "string" ? input.projectId : "";
    const idempotencyKey = typeof input.idempotencyKey === "string" ? (input.idempotencyKey.trim().slice(0, 120) || null) : null;

    if (!UUID.test(projectId)) return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
    if (!prompt || prompt.length > 2000) return NextResponse.json({ error: "Prompt must contain 1–2,000 characters." }, { status: 400 });

    const sql = getDb();
    const appUserId = await getOrCreateAppUser(user);
    const owned = await sql`SELECT id FROM creative_projects WHERE id = ${projectId}::uuid AND user_id = ${appUserId}`;
    if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const daily = await sql`SELECT count(*)::int AS count FROM generation_jobs WHERE user_id = ${appUserId} AND parameters->>'purpose' = 'async_text_generation' AND created_at >= date_trunc('day', now())`;
    if (Number(daily[0]?.count ?? 0) >= 10) {
      return NextResponse.json({ error: "Daily free-workspace queue limit reached (10 jobs). Try again tomorrow." }, { status: 429 });
    }

    if (idempotencyKey) {
      const existing = await sql`SELECT id, status, created_at FROM generation_jobs WHERE user_id = ${appUserId} AND idempotency_key = ${idempotencyKey} LIMIT 1`;
      if (existing.length) return NextResponse.json({ job: existing[0], reused: true }, { status: 200 });
    }

    const rows = await sql`
      INSERT INTO generation_jobs
        (user_id, project_id, job_type, provider, model, status, progress, prompt, parameters, idempotency_key, max_attempts)
      VALUES
        (${appUserId}, ${projectId}::uuid, 'campaign', 'pending', 'pending', 'queued', 0, ${prompt},
         ${JSON.stringify({ purpose: "async_text_generation", outputFormat: "json" })}::jsonb,
         ${idempotencyKey}, 3)
      ON CONFLICT (user_id, idempotency_key) DO NOTHING
      RETURNING id, project_id AS "projectId", status, progress, attempt_count AS "attemptCount", created_at AS "createdAt"
    `;
    if (!rows.length && idempotencyKey) {
      const existing = await sql`SELECT id, status, created_at FROM generation_jobs WHERE user_id = ${appUserId} AND idempotency_key = ${idempotencyKey} LIMIT 1`;
      return NextResponse.json({ job: existing[0], reused: true }, { status: 200 });
    }
    return NextResponse.json({ job: rows[0], reused: false }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const unavailable = message.toLowerCase().includes("not configured");
    return NextResponse.json(
      { error: unavailable ? "The generation queue is not configured yet." : "Could not queue this generation job." },
      { status: unavailable ? 503 : 500 },
    );
  }
}
