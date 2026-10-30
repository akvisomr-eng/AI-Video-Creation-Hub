-- Additive queue/worker metadata. Apply to the Neon development branch first.
BEGIN;
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_token text;
ALTER TABLE public.generation_jobs
  ADD CONSTRAINT generation_jobs_attempt_count_check CHECK (attempt_count >= 0),
  ADD CONSTRAINT generation_jobs_max_attempts_check CHECK (max_attempts BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_queue
  ON public.generation_jobs (next_attempt_at, created_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_generation_jobs_expired_lease
  ON public.generation_jobs (locked_at)
  WHERE status = 'processing';
COMMIT;
