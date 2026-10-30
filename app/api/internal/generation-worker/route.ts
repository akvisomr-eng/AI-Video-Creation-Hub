import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateCreativeJson } from "@/lib/ai/text-gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.GENERATION_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Worker database is not configured." }, { status: 503 });

  const sql = getDb();
  const token = randomUUID();
  try {
    // Recover crashed workers after the lease expires. Retry only within the
    // configured attempt budget; stale work is never left processing forever.
    await sql`
      UPDATE generation_jobs
      SET status = CASE WHEN attempt_count < max_attempts THEN 'queued' ELSE 'failed' END,
          next_attempt_at = CASE WHEN attempt_count < max_attempts THEN now() ELSE NULL END,
          error_code = 'worker_lease_expired',
          error_message = 'A worker stopped before completing this job.',
          completed_at = CASE WHEN attempt_count < max_attempts THEN NULL ELSE now() END,
          locked_at = NULL,
          worker_token = NULL,
          updated_at = now()
      WHERE status = 'processing'
        AND locked_at < now() - interval '3 minutes'
        AND parameters->>'purpose' = 'async_text_generation'
    `;

    // One atomic UPDATE claims exactly one eligible job. No long-lived DB transaction
    // is held while the external AI provider runs.
    const claimed = await sql`
      WITH candidate AS (
        SELECT id
        FROM generation_jobs
        WHERE status = 'queued'
          AND (next_attempt_at IS NULL OR next_attempt_at <= now())
          AND job_type = 'campaign'
          AND parameters->>'purpose' = 'async_text_generation'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE generation_jobs AS job
      SET status = 'processing',
          progress = 10,
          attempt_count = attempt_count + 1,
          started_at = COALESCE(started_at, now()),
          locked_at = now(),
          worker_token = ${token},
          updated_at = now()
      FROM candidate
      WHERE job.id = candidate.id
      RETURNING job.id, job.prompt, job.user_id, job.attempt_count, job.max_attempts
    `;

    if (!claimed.length) return NextResponse.json({ claimed: false, message: "No eligible jobs." });
    const job = claimed[0];
    const jobId = String(job.id);
    try {
      const generated = await generateCreativeJson([
        "You are a creative production assistant. Produce a concise, useful JSON response for the user's creative brief.",
        "Return valid JSON only. Do not claim that images, video, audio, or files were generated.",
        "Use this shape: {title:string, summary:string, production_steps:string[], visual_direction:string, narration_draft:string}.",
        `Creative brief: ${String(job.prompt ?? "").slice(0, 2000)}`,
      ].join("\n"));
      const output = JSON.parse(generated.text) as unknown;
      if (!output || typeof output !== "object" || Array.isArray(output)) throw new Error("Provider returned invalid JSON output.");

      const saved = await sql`
        UPDATE generation_jobs
        SET status = 'succeeded',
            progress = 100,
            provider = ${generated.provider},
            model = ${generated.model},
            parameters = parameters || ${JSON.stringify({ result: output, outputFormat: "json" })}::jsonb,
            error_code = NULL,
            error_message = NULL,
            completed_at = now(),
            locked_at = NULL,
            worker_token = NULL,
            updated_at = now()
        WHERE id = ${jobId}::uuid AND worker_token = ${token}
        RETURNING id, status, provider, model, completed_at AS "completedAt"
      `;
      if (!saved.length) return NextResponse.json({ claimed: true, completed: false, reason: "Lease lost before completion." }, { status: 409 });
      return NextResponse.json({ claimed: true, completed: true, job: saved[0] });
    } catch (error) {
      const attempt = Number(job.attempt_count);
      const maxAttempts = Number(job.max_attempts);
      const retry = attempt < maxAttempts;
      const delaySeconds = Math.min(300, 15 * (2 ** Math.max(0, attempt - 1)));
      const internalMessage = retry ? "Temporary provider failure; retry has been scheduled." : "Generation failed after the configured retry limit. Check provider configuration.";
      await sql`
        UPDATE generation_jobs
        SET status = ${retry ? "queued" : "failed"},
            progress = 0,
            next_attempt_at = ${retry ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null}::timestamptz,
            error_code = 'worker_generation_failed',
            error_message = ${internalMessage},
            completed_at = ${retry ? null : new Date().toISOString()}::timestamptz,
            locked_at = NULL,
            worker_token = NULL,
            updated_at = now()
        WHERE id = ${jobId}::uuid AND worker_token = ${token}
      `;
      return NextResponse.json({ claimed: true, completed: false, retryScheduled: retry, attempt, maxAttempts });
    }
  } catch {
    return NextResponse.json({ error: "Generation worker could not claim or update a job." }, { status: 500 });
  }
}
