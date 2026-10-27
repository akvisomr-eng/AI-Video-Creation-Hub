# Deployment readiness — AI Video Creator

This runbook is for a new, isolated Vercel project. Do not reuse or edit environment variables on any other project.

## Deployment target

- Repository: `akvisomr-eng/AI-Video-Creation-Hub`
- Framework: Next.js App Router
- Runtime: Node.js 22+
- Database: Neon project `long-cloud-98554230`, branch `development` (`br-icy-wave-b33vb56m`) for preview only
- Database region: `aws-ap-southeast-1`
- Neon Auth base URL for development: `https://ep-silent-truth-b30i2dcr.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth`
- Private media bucket: `creator-media`
- Function region suggestion: Singapore (`sin1`) to keep app functions closer to Neon.

## Required environment variables

Set these only on the new AI Video Creator Vercel project. Use Vercel's encrypted/sensitive type for secrets.

| Variable | Preview requirement | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Required | Pooled Neon connection string for the **development** branch; never use production for preview |
| `NEON_AUTH_BASE_URL` | Required | Use the development branch's Auth base URL above |
| `NEON_AUTH_COOKIE_SECRET` | Required | Generate a unique random secret of at least 32 characters; do not reuse another app's secret |
| `APP_PUBLIC_URL` | Recommended | Exact deployed preview origin, without a trailing slash |
| `AWS_ACCESS_KEY_ID` | Media-upload feature only | Branch-scoped Neon Object Storage credential |
| `AWS_SECRET_ACCESS_KEY` | Media-upload feature only | Store as a secret |
| `AWS_ENDPOINT_URL_S3` | Media-upload feature only | Development branch endpoint: `https://br-icy-wave-b33vb56m.storage.c-4.ap-southeast-1.aws.neon.tech` |
| `AWS_REGION` | Media-upload feature only | `ap-southeast-1` |
| `NEON_STORAGE_BUCKET` | Media-upload feature only | `creator-media` |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` | Optional | Add only provider keys you have explicitly chosen; usage is quota-limited and provider data terms must be reviewed |
| `AI_MULTI_AGENT_ENABLED` | Optional | Keep `false` by default to reduce requests and cost |

Do not place API keys or database credentials in `NEXT_PUBLIC_*` variables. Do not commit real values to GitHub.

## Required sequence

1. Install/authorize the GitHub integration for the Vercel team, then create a dedicated Vercel project named `ai-video-creator` linked to this repository. Keep unrelated Vercel projects unchanged.
2. Use the branch `feature/ai-video-creator-foundation-2026` as a Preview deployment first; do not promote it to Production until acceptance tests pass.
3. Add the required development-only environment variables in the new Vercel project.
4. After the preview URL exists, add that exact HTTPS origin as a trusted domain in Neon Auth for the development branch. Keep localhost origins for local development.
5. Deploy Preview and verify `/api/health` returns HTTP 200 with database `ok`; verify `/api/capabilities` does not expose secrets; sign up/sign in; create a project and storyboard; verify asset upload and download with private storage.
6. Confirm logs contain no credentials or private media URLs. Confirm limits and error paths are enforced.
7. Only after the Preview acceptance checklist passes, decide separately whether to configure Production. Production must use a dedicated production environment, production Neon branch, its own cookie secret, and an explicitly approved deployment.

## Current limitations / honest status

- GitHub Actions CI for the foundation currently passes (contract checks + Next.js build).
- Neon development Auth and private storage are provisioned; the `creator-media` bucket exists.
- The Neon development Auth trusted domains currently include localhost only. A deployment origin must be added after Vercel creates the preview URL.
- Vercel project creation with GitHub linking is currently blocked because the GitHub integration is not installed/authorized for the selected Vercel team. This requires a one-time action in Vercel by an account owner; do not bypass it by deploying into another app.
- Image generation, video generation, text-to-speech, background rendering, and end-to-end upload verification are not yet operational. Do not advertise the app as a complete AI video generator until those paths are implemented and tested.
