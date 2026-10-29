# AI Video Creator

A responsive creator workspace for planning, storyboarding, and eventually generating/editing short-form AI videos.

## Current implementation

- Next.js App Router + TypeScript workspace UI.
- Neon Managed Auth provisioned on both the `development` and `production` Neon branches.
- Authenticated project list and project creation API.
- Per-project storyboard editor with prompt and narration fields.
- Multi-provider Creative Director gateway for Gemini, Groq, Cerebras, and OpenRouter, with configurable fallback order and persisted provider/model attribution.
- Media Director prompt-planning layer with creative presets (cinematic, commercial, anime, documentary, product hero, music video, social reel), aspect-ratio guidance, target-platform selection/recommendation, shot/camera/lighting prompts, and continuity constraints.
- MIT provenance and attribution for workflow concepts adapted from `Hao0321/ai-media-generator`; see [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md).
- Optional independent storyboard quality-review agent via `AI_MULTI_AGENT_ENABLED=true`; disabled by default to conserve free-tier quota, and gracefully falls back to the original draft if review fails.
- Authenticated provider capability/status endpoint at `/api/ai/providers` (configuration status only; does not expose secrets or claim live provider health).
- Private Neon Object Storage buckets provisioned on both production and development branches.
- Authenticated presigned media uploads, verified asset registration, and private download links (requires branch-scoped storage credentials and bucket CORS setup).
- Basic abuse controls: 10 AI storyboard drafts per user per day, 20 registered media assets per day, 50 MB per file, and 250 MB registered media per account.
- Server-side ownership checks for projects and scenes.
- Storyboard total duration is validated server-side and cannot exceed 30 seconds.
- Health endpoint at `/api/health` reports database/auth/provider configuration without exposing secrets.
- Local-first Image-to-Motion Studio at `/video-studio`: animate a still image with camera motion and export WebM in supported browsers.
- Browser-based Photo Retouch Studio at `/retouch`: local photo import, preset looks, light/color controls, crop, rotate/flip, compare original, and PNG/JPEG export. Source photos stay in the browser. AI restoration and prompt-guided edits are not connected; see [`docs/PHOTO_RETOUCH_NOTICES.md`](docs/PHOTO_RETOUCH_NOTICES.md).
- GitHub Actions build workflow.

## Infrastructure

- Source repository: GitHub.
- PostgreSQL: Neon project `AI Video Creator`, database `neondb`.
- Reproducible baseline schema: [`database/schema.sql`](database/schema.sql), syntax-checked against the development branch.
- Production branch: `br-purple-fire-b3mbm4jo`.
- Development branch: `br-icy-wave-b33vb56m` (isolated from production; use this branch for app development and auth testing).

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for isolated Vercel Preview setup, environment variables, Neon Auth trusted-origin configuration, and acceptance checks. Do not configure Production until Preview acceptance passes.

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to the pooled connection string for the Neon **development** branch.
4. Set `NEON_AUTH_BASE_URL` to the Auth base URL shown for that same development branch in Neon.
5. Generate `NEON_AUTH_COOKIE_SECRET` with a secure random value of at least 32 characters. Never commit `.env.local`.
6. Set the S3-compatible `AWS_*` variables for the same Neon branch in `.env.local` if testing media upload. Set `NEON_STORAGE_BUCKET=creator-media`. Run `npm run storage:cors` once per branch/environment to configure the bucket's browser upload CORS policy.
7. Install and run:

   ```bash
   npm install
   npm run dev
   ```

8. Open `http://localhost:3000`, create an account, create a project, add storyboard scenes, and upload media.

## AI provider status

Text-based AI storyboard drafting uses a provider gateway. Optional adapters currently support Gemini Developer API, Groq, Cerebras, and OpenRouter; set one or more keys and configure `AI_TEXT_PROVIDER_ORDER` to control fallback order. Set `AI_MULTI_AGENT_ENABLED=true` to run an additional independent quality-review pass; it is off by default because it consumes another request and free-tier quota. Provider fallback is used when a request fails, including quota/rate-limit failures. Review the official limits/pricing and data policies before enabling each provider: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Groq rate limits](https://console.groq.com/docs/rate-limits), [Cerebras pricing](https://inference-docs.cerebras.ai/support/pricing), and [OpenRouter pricing](https://openrouter.ai/pricing). All free tiers have limits and are not guaranteed to remain free. No provider call is made when no supported key is configured.

The Media Director's platform selection is prompt guidance, not a live connection to the selected platform. Browser automation profiles and upstream site-operation scripts have intentionally not been imported. Image/video generation and voiceover are **not yet operational**. Provider credentials alone are not sufficient: each provider needs an adapter, job lifecycle handling, output storage, usage/cost accounting, and end-to-end tests. The Gemini storyboard endpoint currently caps usage at 10 drafts per account per day. The app must not invent successful outputs when a provider is unavailable.

Before enabling a provider, document its free-tier limits, pricing, rate limits, and data handling. Store credentials only as environment secrets. The current health endpoint reports configuration only; it does not certify successful generation.

## Not yet implemented

- Generative AI image/video generation and advanced AI retouching (separate from the local camera-motion and basic retouch tools).
- AI text-to-speech and automatic subtitle generation.
- Multi-clip timeline editing, audio tracks, and MP4 export.
- True generative image-to-video (new subject motion / AI-generated frames).
- Browser upload still needs live verification against the branch's CORS and S3 credentials.
- Background job worker and provider retry/cancellation.
- Native Android/iOS applications.
- Production deployment and live auth verification.

## Security

- Project, storyboard, and asset APIs require an authenticated Neon Auth session; the health endpoint is intentionally public and exposes no secrets.
- Project and scene ownership is checked server-side.
- Keep API keys, database connection strings, and cookie secrets out of Git.
- Neon Auth has been provisioned on both production and development branches. Trusted-domain configuration, live sign-up/sign-in tests, and deployment environment setup still need verification.
