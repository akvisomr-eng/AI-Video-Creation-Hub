# AI Video Creation Hub

A responsive creator workspace for planning, storyboarding, and eventually generating/editing short-form AI videos.

## Current implementation

- Next.js App Router + TypeScript workspace UI.
- Neon Managed Auth integration (enabled on the Neon `development` branch).
- Authenticated project list and project creation API.
- Per-project storyboard editor with prompt and narration fields.
- Server-side ownership checks for projects and scenes.
- Storyboard total duration is validated server-side and cannot exceed 30 seconds.
- Health endpoint at `/api/health` reports database/auth/provider configuration without exposing secrets.
- GitHub Actions build workflow.

## Infrastructure

- Source repository: GitHub.
- PostgreSQL: Neon project `AI Video Creation Hub`, database `neondb`.
- Production branch: `br-purple-fire-b3mbm4jo`.
- Development branch: `br-icy-wave-b33vb56m` (isolated from production; use this branch for app development and auth testing).

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to the pooled connection string for the Neon **development** branch.
4. Set `NEON_AUTH_BASE_URL` to the Auth base URL shown for that same development branch in Neon.
5. Generate `NEON_AUTH_COOKIE_SECRET` with a secure random value of at least 32 characters. Never commit `.env.local`.
6. Install and run:

   ```bash
   npm install
   npm run dev
   ```

7. Open `http://localhost:3000`, create an account, create a project, and add storyboard scenes.

## AI provider status

Image/video generation and voiceover are **not yet operational**. Provider credentials alone are not sufficient: each provider needs an adapter, job lifecycle handling, output storage, usage/cost accounting, and end-to-end tests. The app must not invent successful outputs when a provider is unavailable.

Before enabling a provider, document its free-tier limits, pricing, rate limits, and data handling. Store credentials only as environment secrets. The current health endpoint reports configuration only; it does not certify successful generation.

## Not yet implemented

- AI image/video generation and retouching.
- Text-to-speech, subtitle generation, video rendering/export.
- Media object storage and upload flow.
- Background job worker and provider retry/cancellation.
- Native Android/iOS applications.
- Production deployment and production auth configuration.

## Security

- API routes require an authenticated Neon Auth session before project or storyboard access.
- Project and scene ownership is checked server-side.
- Keep API keys, database connection strings, and cookie secrets out of Git.
- Neon Auth has been provisioned on both production and development branches. Trusted-domain configuration, live sign-up/sign-in tests, and deployment environment setup still need verification.
