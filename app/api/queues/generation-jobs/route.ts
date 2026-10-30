import { handleCallback } from "@vercel/queue";
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
    const finalAttempt = deliveryCount >= 3;
    await sql`
      UPDATE generation_jobs
      SET status = ${finalAttempt ? "failed" : "queued"},
          progress = 0,
          error_code = 'worker_generation_failed',
          error_message = ${finalAttempt ? "Generation failed after the managed queue retry limit." : "Temporary provider failure; the managed queue will retry."},
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
  retry: (_error, metadata) => {
    return { afterSeconds: Math.min(300, 15 * (2 ** Math.max(0, Number(metadata.deliveryCount ?? 1) - 1))) };
  },
});
