import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getConfiguredTextProviders } from "@/lib/ai/text-gateway";
import { getTextProviderUsage } from "@/lib/ai/provider-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const configured = getConfiguredTextProviders();
  const usage = await Promise.all(configured.map(async (provider) => ({ ...provider, ...(await getTextProviderUsage(provider.id)) })));
  return NextResponse.json({
    mode: "multi-provider",
    text: configured,
    usage,
    image: {
      configured: Boolean(process.env.IMAGE_PROVIDER_API_KEY),
      status: "adapter_pending",
      note: "Image generation requires a provider-specific adapter and live test; a key alone does not enable it.",
    },
    video: {
      configured: Boolean(process.env.VIDEO_PROVIDER_API_KEY),
      status: "adapter_pending",
      note: "Video generation requires a provider-specific adapter and live test; a key alone does not enable it.",
    },
    speech: {
      configured: Boolean(process.env.TTS_PROVIDER_API_KEY),
      status: "adapter_pending",
      note: "Text-to-speech requires a provider-specific adapter and live test; a key alone does not enable it.",
    },
    fallbackEnabled: configured.length > 1,
    note: "Configured means an environment key exists, not that the provider has passed a live health test.",
  });
}
