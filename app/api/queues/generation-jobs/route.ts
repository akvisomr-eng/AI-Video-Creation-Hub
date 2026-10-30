import { handleCallback } from "@/lib/queue";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { generateCreativeJson } from "@/lib/ai/text-gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

type QueueMessage = { jobId: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const POST = handleCallback(async (message: QueueMessage, metadata) => {
  if (process.env.GENERATION_QUEUE_ENABLED !== "true") throw new Error("Generation queue is disabled.");
  if (!message || !UUID.test(message.jobId)) throw new Error("Invalid generation queue message.");

  const sql = getDb();
  const token = randomUUID();
  const claimed = await sql`
    UPDATE generation_jobs
    SET status = 'processing',
        progress = 10,
        attempt_count = attempt_count + 1,
        started_at = COALESCE(started_at, now()),
        locked_at = now(),
        worker_token = ${token},
        updated_at = now()
    WHERE id = ${message.jobId}::uuid
      AND parameters->>'purpose' = 'async_text_generation'
      AND (
        status = 'queued'
        OR (status = 'processing' AND locked_at < now() - interval '4 minutes')
      )
    RETURNING id, prompt, attempt_count, max_attempts
  `;

  if (!claimed.length) {
    const existing = await sql`SELECT status FROM generation_jobs WHERE id = ${message.jobId}::uuid`;
    if (["succeeded", "failed", "cancelled"].includes(String(existing[0]?.status ?? ""))) return;
    throw new Error("Generation job is already leased; the queue will retry after visibility expires.");
  }

  const job = claimed[0];
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
      WHERE id = ${message.jobId}::uuid AND worker_token = ${token}
      RETURNING id
    `;
    if (!saved.length) throw new Error("Generation job lease was lost before completion.");
  } catch (error) {
    const deliveryCount = Number(metadata.deliveryCount ?? 1);
    const providerStatus = error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0;
    const providerCode = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
    const rateLimited = providerStatus === 429 && providerCode === "provider_rate_limited";
    const quotaReached = providerStatus === 429 && !rateLimited;
    const finalAttempt = quotaReached || (!rateLimited && Number(job.attempt_count) >= Number(job.max_attempts ?? 3));
    await sql`
      UPDATE generation_jobs
      SET status = ${finalAttempt ? "failed" : "queued"},
          progress = 0,
          attempt_count = CASE WHEN ${rateLimited} THEN GREATEST(attempt_count - 1, 0) ELSE attempt_count END,
          error_code = ${quotaReached ? "free_daily_quota" : rateLimited ? "provider_rate_limited" : "worker_generation_failed"},
          error_message = ${quotaReached ? "The free-provider daily request budget has been reached. Try again after the daily reset." : rateLimited ? "Provider is at its per-minute free-tier limit; retrying shortly." : finalAttempt ? "Generation failed after the managed queue retry limit." : "Temporary provider failure; the managed queue will retry."},
          completed_at = ${finalAttempt ? new Date().toISOString() : null}::timestamptz,
          locked_at = NULL,
          worker_token = NULL,
          updated_at = now()
      WHERE id = ${message.jobId}::uuid AND worker_token = ${token}
    `;
    if (finalAttempt) return;
    throw error;
  }
}, {
  visibilityTimeoutSeconds: 300,
  retry: (error, metadata) => {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
    const delay = code === "provider_rate_limited" ? 60 : Math.min(300, 15 * (2 ** Math.max(0, Number(metadata.deliveryCount ?? 1) - 1)));
    return { afterSeconds: delay };
  },
});
