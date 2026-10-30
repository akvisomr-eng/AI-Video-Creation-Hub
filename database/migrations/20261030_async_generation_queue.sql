-- Additive and re-runnable queue/worker metadata. Apply to Neon development first.
BEGIN;
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_token text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_attempt_count_check') THEN
    ALTER TABLE public.generation_jobs ADD CONSTRAINT generation_jobs_attempt_count_check CHECK (attempt_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_max_attempts_check') THEN
    ALTER TABLE public.generation_jobs ADD CONSTRAINT generation_jobs_max_attempts_check CHECK (max_attempts BETWEEN 1 AND 5);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_generation_jobs_queue
  ON public.generation_jobs (next_attempt_at, created_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_generation_jobs_expired_lease
  ON public.generation_jobs (locked_at)
  WHERE status = 'processing';
CREATE TABLE IF NOT EXISTS public.ai_provider_daily_usage (
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  provider text NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, provider)
);
CREATE INDEX IF NOT EXISTS idx_ai_provider_daily_usage_date
  ON public.ai_provider_daily_usage (usage_date DESC);
COMMIT;
