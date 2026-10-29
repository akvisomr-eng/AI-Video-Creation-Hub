# Deployment readiness — AI Video Creator

This runbook describes the current isolated Vercel project and the remaining acceptance gates. Do not treat a successful build as proof that authentication, database writes, media upload, or AI generation works end-to-end.

## Deployment target and current state

- Repository: `akvisomr-eng/AI-Video-Creation-Hub`
- Vercel project: `ai-video-creator` (team `akvisio-autohost`)
- Framework: Next.js App Router
- Production deployment from `main`: commit `e83a3be1263dfea96a2db467756327981e241bca`, state `READY`
- Production aliases: `ai-video-creator-iota.vercel.app`, `ai-video-creator-akvisio-autohost.vercel.app`, and `ai-video-creator-git-main-akvisio-autohost.vercel.app`
- Neon project: `long-cloud-98554230`, database `neondb`
- Production branch: `br-purple-fire-b3mbm4jo`
- Development branch: `br-icy-wave-b33vb56m`
- Private media bucket: `creator-media`
- Vercel SSO protection is configured for Preview deployments; production deployment URLs are public. **Production environment variables have not been configured**, so the production app must be considered a visual/build deployment only until the health check and authentication are verified.

## Environment variables

Use Vercel's encrypted/sensitive type for secrets. Never commit real values to GitHub or put credentials in `NEXT_PUBLIC_*`.

| Variable | Preview | Production |
| --- | --- | --- |
| `DATABASE_URL` | Configured for isolated Neon development branch on the feature preview branches listed below | Not configured |
| `NEON_AUTH_BASE_URL` | Configured for Neon development branch | Not configured |
| `NEON_AUTH_COOKIE_SECRET` | Unique per feature preview branch | Not configured |
| `APP_PUBLIC_URL` | Stable preview alias per feature branch | Not configured |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `NEON_STORAGE_BUCKET` | Not configured; media upload needs setup and verification | Not configured |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` | Optional; none verified as operational | Not configured/verified |
| `AI_MULTI_AGENT_ENABLED` | `false` | Not configured |

Preview environment variables are scoped to `feat/photo-retouch-studio` and `feat/photo-retouch-studio-rebased`, using only the Neon development branch. Do not copy development credentials into Production.

## Acceptance checklist

Before calling the application operational, complete these checks against the current Preview deployment:

1. `GET /api/health` returns HTTP 200 and reports database `ok`.
2. `GET /api/capabilities` and `GET /api/ai/providers` do not expose credentials.
3. Sign up, sign in, session persistence, and sign out work against the development Neon Auth branch.
4. Create a project, create/edit storyboard scenes, reload the project, and confirm data persists.
5. Confirm users cannot read or mutate another user's projects, scenes, or assets.
6. Test media upload/download with branch-scoped storage credentials and bucket CORS; verify private URLs are not logged or exposed.
7. Test rate limits and expected provider-failure behavior.
8. Test Photo Retouch Studio import, crop, rotation, compare, PNG/JPEG export, and Image-to-Motion WebM export in a real browser.
9. Confirm production environment configuration is separately reviewed and points only to the Neon production branch.
10. Only after Preview acceptance passes, configure Production secrets, add the production aliases as Neon Auth trusted origins, deploy, and rerun the checks against Production.

## Current feature boundaries

- `/retouch`: browser-local pixel editing only; not AI restoration, object removal, or prompt-guided image generation.
- `/video-studio`: browser-local camera motion and WebM export; not true generative image-to-video.
- Storyboard generation supports configured text-provider adapters (Gemini, Groq, Cerebras, OpenRouter), but provider calls are not operational until credentials, quota, and live request/response handling are verified.
- Image generation, true video generation, text-to-speech, background rendering, timeline editing, audio tracks, and MP4 export are not yet operational.
- Media upload requires Neon Object Storage S3-compatible credentials and CORS configuration; bucket existence alone is not enough.
- Native Android/iOS applications are not included.

## Security and cost controls

- Keep development and production Neon branches separate.
- Keep provider API keys, database URLs, S3 credentials, and cookie secrets in encrypted/sensitive environment variables only.
- Keep `AI_MULTI_AGENT_ENABLED=false` until provider calls are verified; the second review pass consumes additional quota.
- Retain per-user storyboard and asset quotas; do not claim an AI feature is live based only on a configured key.
- Use the public health endpoint as a configuration/database check, not as proof that AI generation works.
