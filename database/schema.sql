-- Baseline schema snapshot for AI Video Creation Hub.
-- Derived from the Neon development branch on 2026-10-27.
-- Apply to a new empty database only. Production changes should use reviewed migrations.
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_subject text,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'creator'::text,
  plan text NOT NULL DEFAULT 'free'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_users_auth_subject_key UNIQUE (auth_subject),
  CONSTRAINT app_users_email_key UNIQUE (email),
  CONSTRAINT app_users_pkey PRIMARY KEY (id),
  CONSTRAINT app_users_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'creator'::text, 'pro'::text, 'business'::text]))),
  CONSTRAINT app_users_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'moderator'::text, 'admin'::text])))
);

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  handle text,
  bio text,
  brand_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creator_profiles_handle_key UNIQUE (handle),
  CONSTRAINT creator_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT creator_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT creator_profiles_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.creative_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled project'::text,
  description text,
  project_type text NOT NULL DEFAULT 'video'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creative_projects_pkey PRIMARY KEY (id),
  CONSTRAINT creative_projects_project_type_check CHECK ((project_type = ANY (ARRAY['image'::text, 'video'::text, 'campaign'::text, 'edit'::text]))),
  CONSTRAINT creative_projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'queued'::text, 'processing'::text, 'ready'::text, 'failed'::text, 'archived'::text]))),
  CONSTRAINT creative_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  asset_type text NOT NULL,
  storage_provider text,
  storage_key text,
  public_url text,
  mime_type text,
  file_name text,
  file_size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  moderation_state text NOT NULL DEFAULT 'pending'::text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_asset_type_check CHECK ((asset_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'subtitle'::text, 'thumbnail'::text, 'other'::text]))),
  CONSTRAINT media_assets_file_size_bytes_check CHECK (((file_size_bytes IS NULL) OR (file_size_bytes >= 0))),
  CONSTRAINT media_assets_moderation_state_check CHECK ((moderation_state = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text]))),
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE SET NULL,
  CONSTRAINT media_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  job_type text NOT NULL,
  provider text,
  model text,
  status text NOT NULL DEFAULT 'queued'::text,
  progress integer NOT NULL DEFAULT 0,
  prompt text,
  input_asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  output_asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  idempotency_key text,
  estimated_cost_usd numeric,
  actual_cost_usd numeric,
  error_code text,
  error_message text,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT generation_jobs_job_type_check CHECK ((job_type = ANY (ARRAY['text_to_image'::text, 'image_to_image'::text, 'retouch'::text, 'text_to_video'::text, 'image_to_video'::text, 'voiceover'::text, 'subtitle'::text, 'render'::text, 'campaign'::text]))),
  CONSTRAINT generation_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT generation_jobs_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
  CONSTRAINT generation_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE SET NULL,
  CONSTRAINT generation_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))),
  CONSTRAINT generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT generation_jobs_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  agent_name text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider text,
  model text,
  cost_usd numeric,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_runs_agent_name_check CHECK ((agent_name = ANY (ARRAY['orchestrator'::text, 'creative_director'::text, 'visual'::text, 'motion'::text, 'voice_language'::text, 'quality_safety'::text, 'editor'::text, 'publisher'::text]))),
  CONSTRAINT agent_runs_job_id_fkey FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE,
  CONSTRAINT agent_runs_pkey PRIMARY KEY (id),
  CONSTRAINT agent_runs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text])))
);

CREATE TABLE IF NOT EXISTS public.storyboard_scenes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  scene_order integer NOT NULL,
  title text,
  prompt text NOT NULL DEFAULT ''::text,
  narration_text text,
  duration_seconds numeric NOT NULL DEFAULT 5,
  visual_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_asset_id uuid,
  generated_asset_id uuid,
  transition text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT storyboard_scenes_duration_seconds_check CHECK (((duration_seconds > (0)::numeric) AND (duration_seconds <= (30)::numeric))),
  CONSTRAINT storyboard_scenes_generated_asset_id_fkey FOREIGN KEY (generated_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  CONSTRAINT storyboard_scenes_pkey PRIMARY KEY (id),
  CONSTRAINT storyboard_scenes_project_id_fkey FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE CASCADE,
  CONSTRAINT storyboard_scenes_project_id_scene_order_key UNIQUE (project_id, scene_order),
  CONSTRAINT storyboard_scenes_scene_order_check CHECK ((scene_order >= 0)),
  CONSTRAINT storyboard_scenes_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  CONSTRAINT storyboard_scenes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'queued'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);

CREATE TABLE IF NOT EXISTS public.caption_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  language_code text NOT NULL DEFAULT 'id'::text,
  track_type text NOT NULL DEFAULT 'subtitle'::text,
  format text NOT NULL DEFAULT 'vtt'::text,
  content text NOT NULL DEFAULT ''::text,
  source text NOT NULL DEFAULT 'manual'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT caption_tracks_format_check CHECK ((format = ANY (ARRAY['vtt'::text, 'srt'::text, 'json'::text]))),
  CONSTRAINT caption_tracks_pkey PRIMARY KEY (id),
  CONSTRAINT caption_tracks_project_id_fkey FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE CASCADE,
  CONSTRAINT caption_tracks_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai_transcription'::text, 'ai_translation'::text]))),
  CONSTRAINT caption_tracks_track_type_check CHECK ((track_type = ANY (ARRAY['subtitle'::text, 'transcript'::text, 'karaoke'::text])))
);

CREATE TABLE IF NOT EXISTS public.usage_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid,
  usage_type text NOT NULL,
  provider text,
  model text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'request'::text,
  cost_usd numeric NOT NULL DEFAULT 0,
  credits_delta integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usage_ledger_job_id_fkey FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE SET NULL,
  CONSTRAINT usage_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT usage_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  caption text,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  external_post_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT social_posts_pkey PRIMARY KEY (id),
  CONSTRAINT social_posts_project_id_fkey FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE SET NULL,
  CONSTRAINT social_posts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text, 'failed'::text, 'cancelled'::text]))),
  CONSTRAINT social_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creative_projects_user_updated ON public.creative_projects USING btree (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_project_created ON public.media_assets USING btree (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created ON public.generation_jobs USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_created ON public.generation_jobs USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_job_created ON public.agent_runs USING btree (job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_project_order ON public.storyboard_scenes USING btree (project_id, scene_order);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_created ON public.usage_ledger USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_publication ON public.social_posts USING btree (status, scheduled_at);

COMMIT;
