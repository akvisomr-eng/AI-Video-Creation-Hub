import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports product capabilities without exposing credentials or implying that
 * configured providers have passed a live generation test.
 */
export async function GET() {
  const textProviders = [
    ["gemini", process.env.GEMINI_API_KEY],
    ["groq", process.env.GROQ_API_KEY],
    ["cerebras", process.env.CEREBRAS_API_KEY],
    ["openrouter", process.env.OPENROUTER_API_KEY],
  ].map(([name, key]) => ({
    name,
    configured: Boolean(key),
    status: key ? "configured_not_live_tested" : "not_configured",
  }));

  const objectStorageConfigured = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_REGION,
  );

  return NextResponse.json({
    product: "AI Video Creator",
    mode: "free-tier-first",
    capabilities: {
      authentication: {
        configured: Boolean(process.env.NEON_AUTH_BASE_URL) &&
          (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) >= 32,
        status: "configuration_only",
      },
      projectAndStoryboard: { available: true, status: "implemented" },
      privateMediaStorage: {
        configured: objectStorageConfigured,
        status: objectStorageConfigured ? "configured_not_live_tested" : "not_configured",
      },
      textPlanning: {
        providers: textProviders,
        status: textProviders.some((provider) => provider.configured)
          ? "provider_configured_not_live_tested"
          : "provider_required",
      },
      imageGeneration: { available: false, status: "adapter_pending" },
      videoGeneration: { available: false, status: "adapter_pending" },
      textToSpeech: { available: false, status: "adapter_pending" },
      subtitleAndRender: { available: false, status: "worker_pending" },
      nativeMobileApps: { available: false, status: "not_implemented" },
    },
    safety: {
      providerCallsMade: false,
      credentialsExposed: false,
      note: "Configuration is not proof of provider health. Generation remains disabled until adapters and end-to-end tests are implemented.",
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
