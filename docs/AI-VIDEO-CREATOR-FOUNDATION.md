# AI Video Creator — foundation audit

**Audit date:** 2026-10-27  
**Repository:** `akvisomr-eng/AI-Video-Creation-Hub`  
**Implementation branch:** `feature/ai-video-creator-foundation-2026`

## Scope and safety boundary

This work is isolated to the feature branch. It does not merge into `main`, modify the Neon production branch, change environment secrets, or alter other projects. Development/testing must use Neon project `long-cloud-98554230`, branch `br-icy-wave-b33vb56m` only, unless a separately approved isolated resource is created.

## Infrastructure audit

- GitHub repository is accessible with push/admin permissions; default branch is `main`.
- The repository already contains a Next.js App Router + TypeScript application, Neon Auth integration, authenticated project/storyboard APIs, a multi-provider text-planning gateway, private-media upload code, a health endpoint, and a GitHub Actions build workflow.
- Neon project `long-cloud-98554230` has a `production` branch (`br-purple-fire-b3mbm4jo`) and an isolated `development` branch (`br-icy-wave-b33vb56m`). The development branch already has the app's core tables and Neon Auth schema.
- A second Neon project, `jolly-sun-01325110`, also named “AI Video Creation Hub”, has a `main` branch and similar application tables. It is a duplicate candidate; do not delete, migrate, or use it without explicit review.
- Vercel project search returned no project matching “AI Video Creation Hub”. No deployment is assumed.
- Existing README explicitly states that image/video generation, TTS, subtitle generation, rendering, background workers, mobile apps, live auth verification, and full deployment are not yet operational.
- Existing CI builds the app on Node.js 22, but currently only triggers on pushes to `main` and pull requests targeting `main`.

## Implemented in this foundation branch

1. Added `GET /api/capabilities`, a secret-safe machine-readable feature-status endpoint.
2. It distinguishes implemented planning features from provider configuration and from unimplemented generation/rendering features.
3. It never calls providers and does not claim that a configured API key proves a live test succeeded.
4. This document records infrastructure guardrails and staged work.

## Staged delivery plan

### Stage 1 — safe baseline (current)
- Keep all code changes on this feature branch.
- Expose truthful capability state without secret leakage.
- Validate build and health response in preview/local development.

### Stage 2 — project workflow and provider contracts
- Add unit-tested provider adapter contracts and input validation.
- Keep generation unavailable unless a provider adapter is implemented, cost/usage controls exist, and a live test passes.
- Add per-user idempotent job lifecycle, status polling, cancellation, retries, and cost/usage ledger integration.

### Stage 3 — media and rendering worker
- Verify branch-scoped object-storage CORS and upload/download end-to-end.
- Implement a separate worker for TTS, subtitles, FFmpeg rendering, temp-file cleanup, and bounded resource use.
- Keep heavy rendering out of Next.js request handlers.

### Stage 4 — safety, release and mobile
- Add abuse limits, upload MIME/size validation, moderation hooks, dependency audit, and integration tests.
- Build responsive web experience first; consider Expo Android/iOS only after web workflow is stable.
- Deploy only after preview CI and explicit production readiness review.

## Free-tier-first policy

- Provider keys are optional; never require a paid API to load the workspace.
- Do not automatically call multiple providers or run second-pass agents unless explicitly enabled.
- Estimate and record cost before any paid generation job; enforce quotas server-side.
- Treat free-tier quotas and policies as changeable; never advertise a provider as unlimited or guaranteed free.
- Keep secrets in local environment files or hosting secret stores, never in source control.
- No fake output: a provider failure must return an explicit failure state.

## Validation checklist

- [ ] CI build succeeds on the feature branch via a draft pull request.
- [ ] `/api/capabilities` returns HTTP 200 with no configured secrets or raw key values.
- [ ] `/api/health` is checked separately; configuration status is not mistaken for generation health.
- [ ] Auth, project create/list, storyboard save, and media upload are verified against the development branch only.
- [ ] Image/video/audio generation remains marked pending until an actual adapter and end-to-end test are available.
- [ ] No production database migration or production deployment is performed as part of this stage.
