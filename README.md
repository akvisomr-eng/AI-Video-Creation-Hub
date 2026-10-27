# AI Video Creation Hub

AI-powered creative workspace for planning, generating, editing, and assembling short-form videos.

## Product goals

- Responsive web creator workspace designed for desktop and mobile.
- Prompt-to-image and prompt-to-video workflows, image retouching, image-to-video, captions, subtitles, narration, and short clip assembly up to 30 seconds.
- Storyboard and multi-agent creative workflow: creative direction, visual planning, motion, voice/language, quality and safety, editing, and publishing.
- Provider-agnostic AI integrations with transparent usage, quota, and cost tracking.
- Free-tier-first architecture. Never show a fake generated result when no provider is configured or a generation job fails.

## Infrastructure

- GitHub for source control and CI.
- Neon PostgreSQL for application data, projects, assets, generation jobs, agent runs, storyboard scenes, caption tracks, usage ledger, and social posts.

## Development status

Repository initialization. Features must not be described as operational until provider credentials are configured and end-to-end tests pass.

## Security

Keep API keys and database connection strings in environment variables or a secrets manager. Never commit credentials or production secrets.
