import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";
import { generateCreativeJson, getConfiguredTextProviders } from "@/lib/ai/text-gateway";
import { buildDirectorInstructions, normalizeCreativeOptions } from "@/lib/ai/media-director";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANGUAGES: Record<string, string> = {
  id: "Indonesian", en: "English", ms: "Malay", ja: "Japanese", ko: "Korean",
  zh: "Chinese (Simplified)", fr: "French", es: "Spanish", de: "German",
};
type GeneratedScene = { title: string; visual_prompt: string; narration: string; duration_seconds: number };
type GeneratedPlan = { project_title: string; scenes: GeneratedScene[] };

function parsePlan(text: string): GeneratedPlan {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("Model returned invalid storyboard data.");
  const data = parsed as Record<string, unknown>;
  if (typeof data.project_title !== "string" || !Array.isArray(data.scenes) || data.scenes.length < 1 || data.scenes.length > 10) {
    throw new Error("Model returned an invalid scene list.");
  }
  const scenes = data.scenes.map((raw): GeneratedScene => {
    if (!raw || typeof raw !== "object") throw new Error("Model returned an invalid scene.");
    const scene = raw as Record<string, unknown>;
    const duration = Number(scene.duration_seconds);
    if (typeof scene.visual_prompt !== "string" || !scene.visual_prompt.trim() || !Number.isFinite(duration) || duration <= 0 || duration > 30) {
      throw new Error("Model returned an invalid scene prompt or duration.");
    }
    return {
      title: typeof scene.title === "string" ? scene.title.slice(0, 120) : "",
      visual_prompt: scene.visual_prompt.trim().slice(0, 4000),
      narration: typeof scene.narration === "string" ? scene.narration.trim().slice(0, 2000) : "",
      duration_seconds: Math.round(duration * 10) / 10,
    };
  });
  return { project_title: data.project_title.slice(0, 100), scenes };
}

export async function POST(request: Request) {
  let jobId: string | null = null;
  let agentRunId: string | null = null;
  const sql = process.env.DATABASE_URL ? getDb() : null;
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const configuredProviders = getConfiguredTextProviders();
    if (!configuredProviders.length) {
      return NextResponse.json({ error: "AI storyboard generation is not configured. Add at least one server-side provider key (Gemini, Groq, Cerebras, or OpenRouter). No job was created and no provider was called." }, { status: 503 });
    }
    if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const projectId = typeof input.projectId === "string" ? input.projectId : "";
    const brief = typeof input.brief === "string" ? input.brief.trim().slice(0, 2000) : "";
    const languageCode = typeof input.language === "string" ? input.language : "id";
    const language = LANGUAGES[languageCode];
    const visualStyle = typeof input.visualStyle === "string" ? input.visualStyle.trim().slice(0, 120) : "cinematic, intentional camera movement, natural lighting";
    const targetDuration = Number(input.targetDuration ?? 30);
    const creativeOptions = normalizeCreativeOptions(input);
    const director = buildDirectorInstructions({ brief, visualStyle, ...creativeOptions });
    if (!UUID.test(projectId)) return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
    if (!brief) return NextResponse.json({ error: "Describe the video idea first." }, { status: 400 });
    if (!language) return NextResponse.json({ error: "Unsupported narration language." }, { status: 400 });
    if (!Number.isInteger(targetDuration) || targetDuration < 5 || targetDuration > 30) return NextResponse.json({ error: "Target duration must be between 5 and 30 seconds." }, { status: 400 });

    const appUserId = await getOrCreateAppUser(user);
    const owned = await sql`SELECT id FROM creative_projects WHERE id = ${projectId}::uuid AND user_id = ${appUserId}`;
    if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const dailyCount = await sql`SELECT count(*)::int AS count FROM generation_jobs WHERE user_id = ${appUserId} AND job_type = 'campaign' AND parameters->>'purpose' = 'ai_storyboard' AND created_at >= date_trunc('day', now())`;
    if (Number(dailyCount[0]?.count ?? 0) >= 10) {
      return NextResponse.json({ error: "Free workspace limit reached: up to 10 AI storyboard drafts per day. Try again tomorrow." }, { status: 429 });
    }

    const existingBefore = await sql`SELECT COALESCE(sum(duration_seconds), 0)::numeric AS total FROM storyboard_scenes WHERE project_id = ${projectId}::uuid`;
    const existingBeforeSeconds = Number(existingBefore[0].total);
    const remainingDuration = targetDuration - existingBeforeSeconds;
    if (remainingDuration <= 0) {
      return NextResponse.json({ error: "The storyboard already meets or exceeds the selected target duration. Choose a longer target or remove existing scenes first." }, { status: 422 });
    }

    const model = configuredProviders[0].model;
    const params = { purpose: "ai_storyboard", targetDuration, language: languageCode, visualStyle, ...creativeOptions, selectedPlatform: director.selectedPlatform, providerFallbacks: configuredProviders.map((provider) => provider.id) };
    const jobRows = await sql`
      INSERT INTO generation_jobs (user_id, project_id, job_type, provider, model, status, progress, prompt, parameters, started_at)
      VALUES (${appUserId}, ${projectId}::uuid, 'campaign', 'multi-provider', ${model}, 'processing', 5, ${brief}, ${JSON.stringify(params)}::jsonb, now())
      RETURNING id
    `;
    jobId = String(jobRows[0].id);
    const agentRows = await sql`
      INSERT INTO agent_runs (job_id, agent_name, status, input_summary, provider, model, started_at)
      VALUES (${jobId}::uuid, 'creative_director', 'running', ${JSON.stringify({ brief, targetDuration, language, visualStyle, ...creativeOptions, selectedPlatform: director.selectedPlatform })}::jsonb, 'multi-provider', ${model}, now())
      RETURNING id
    `;
    agentRunId = String(agentRows[0].id);

    const prompt = [
      "You are the Creative Director for an AI media production workspace. Create a concise, production-ready storyboard for a short video.",
      `Video idea: ${brief}`,
      `Remaining storyboard duration available for new scenes: ${remainingDuration} seconds.`,
      `Narration language: ${language}.`,
      director.instructions,
      `Auto-selected target platform guidance: ${director.selectedPlatform}. This is prompt guidance only; do not claim a generation provider was called.`,
      "Return JSON only with shape: {project_title:string, scenes:[{title:string, visual_prompt:string, narration:string, duration_seconds:number}]}",
      "Create 2 to 6 scenes. Each scene duration must be positive, each visual_prompt must be concrete and usable as an image/video generation prompt, and the sum of all duration_seconds must be at most the remaining storyboard duration.",
      "Keep narration concise and in the requested language. If narration is not suitable, use an empty string. Do not include markdown fences or extra fields.",
    ].join("\n");
    let generated: Awaited<ReturnType<typeof generateCreativeJson>>;
    try {
      generated = await generateCreativeJson(prompt);
    } catch (providerError) {
      const providerMessage = providerError instanceof Error ? providerError.message : "All configured AI providers failed.";
      const providerStatus = providerError && typeof providerError === "object" && "status" in providerError ? Number((providerError as { status: unknown }).status) : 502;
      const providerCode = providerError && typeof providerError === "object" && "code" in providerError ? String((providerError as { code: unknown }).code) : "";
      // Keep provider diagnostics in server-side job records only; never echo raw provider
      // messages because they may contain upstream response bodies or implementation details.
      const internalReason = providerMessage.slice(0, 900);
      await sql`UPDATE generation_jobs SET status = 'failed', error_code = ${providerStatus === 503 ? "no_provider" : providerStatus === 429 ? providerCode === "provider_rate_limited" ? "provider_rate_limited" : "free_daily_quota" : "provider_chain_failed"}, error_message = ${internalReason}, completed_at = now(), updated_at = now() WHERE id = ${jobId}::uuid`;
      await sql`UPDATE agent_runs SET status = 'failed', error_message = ${internalReason}, completed_at = now() WHERE id = ${agentRunId}::uuid`;
      return NextResponse.json({
        error: providerStatus === 503
          ? "No AI provider is currently available. Check server configuration and try again."
          : providerStatus === 429 && providerCode === "provider_rate_limited"
            ? "The free-provider per-minute limit has been reached. The request can be retried shortly."
            : providerStatus === 429
              ? "The free-provider daily request budget has been reached. Try again after the daily reset."
            : "AI storyboard generation failed because the configured providers could not complete the request.",
        jobId,
      }, { status: providerStatus === 503 ? 503 : providerStatus === 429 ? 429 : 502 });
    }
    const modelText = generated.text;
    await sql`UPDATE generation_jobs SET provider = ${generated.provider}, model = ${generated.model}, updated_at = now() WHERE id = ${jobId}::uuid`;
    await sql`UPDATE agent_runs SET provider = ${generated.provider}, model = ${generated.model} WHERE id = ${agentRunId}::uuid`;
    let plan = parsePlan(modelText);
    // Optional second agent pass improves continuity and catches invalid prompts without making extra provider calls by default.
    if (process.env.AI_MULTI_AGENT_ENABLED === "true") {
      const reviewRows = await sql`
        INSERT INTO agent_runs (job_id, agent_name, status, input_summary, provider, model, started_at)
        VALUES (${jobId}::uuid, 'quality_safety', 'running', ${JSON.stringify({ purpose: "storyboard_review", sceneCount: plan.scenes.length })}::jsonb, 'multi-provider', ${generated.model}, now())
        RETURNING id
      `;
      const reviewRunId = String(reviewRows[0].id);
      try {
        const reviewPrompt = [
          "Act as an independent storyboard editor and quality reviewer.",
          "Review the draft for scene continuity, practical visual prompts, narration language consistency, and timing.",
          "Correct only clear issues. Preserve the core idea and every scene's total duration; do not add scenes.",
          `Original brief: ${brief}`,
          `Required language: ${language}`,
          `Visual style: ${visualStyle}`,
          director.instructions,
          `Draft JSON: ${JSON.stringify(plan)}`,
          "Return only JSON with shape {project_title:string, scenes:[{title:string, visual_prompt:string, narration:string, duration_seconds:number}]}",
          "Keep the exact same scene count and exact duration_seconds values as the draft. Do not include markdown fences.",
        ].join("\n");
        const reviewed = await generateCreativeJson(reviewPrompt);
        const reviewedPlan = parsePlan(reviewed.text);
        const sameDurations = reviewedPlan.scenes.length === plan.scenes.length
          && reviewedPlan.scenes.every((scene, index) => Math.abs(scene.duration_seconds - plan.scenes[index].duration_seconds) < 0.001);
        if (!sameDurations) throw new Error("Reviewer changed scene count or timing; original draft retained.");
        plan = reviewedPlan;
        await sql`UPDATE agent_runs SET status = 'succeeded', provider = ${reviewed.provider}, model = ${reviewed.model}, output_summary = ${JSON.stringify({ sceneCount: plan.scenes.length, reviewed: true })}::jsonb, completed_at = now() WHERE id = ${reviewRunId}::uuid`;
      } catch (reviewError) {
        const reviewMessage = reviewError instanceof Error ? reviewError.message : "Storyboard review failed.";
        await sql`UPDATE agent_runs SET status = 'failed', error_message = ${reviewMessage.slice(0, 400)}, completed_at = now() WHERE id = ${reviewRunId}::uuid`;
        // The original valid draft remains usable if the optional reviewer is unavailable.
      }
    }
    const total = plan.scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
    if (total > remainingDuration + 0.001 || total > 30) throw new Error("Generated storyboard exceeds the remaining duration limit. Retry with a simpler brief.");

    const existing = await sql`SELECT COALESCE(max(scene_order), -1)::int AS max_order, COALESCE(sum(duration_seconds), 0)::numeric AS total FROM storyboard_scenes WHERE project_id = ${projectId}::uuid`;
    const existingTotal = Number(existing[0].total);
    if (existingTotal + total > 30) throw new Error(`There is only ${Math.max(0, 30 - existingTotal).toFixed(1)} seconds remaining in this storyboard. Remove or shorten existing scenes first.`);
    let order = Number(existing[0].max_order) + 1;
    const createdScenes = [];
    for (const scene of plan.scenes) {
      const rows = await sql`
        INSERT INTO storyboard_scenes (project_id, scene_order, title, prompt, narration_text, duration_seconds, visual_style, status)
        VALUES (${projectId}::uuid, ${order++}, ${scene.title || null}, ${scene.visual_prompt}, ${scene.narration || null}, ${scene.duration_seconds}, ${JSON.stringify({ style: visualStyle, generatedBy: model, ...creativeOptions, selectedPlatform: director.selectedPlatform })}::jsonb, 'draft')
        RETURNING id, scene_order, title, prompt, narration_text, duration_seconds, status, created_at
      `;
      createdScenes.push(rows[0]);
    }
    await sql`UPDATE creative_projects SET title = CASE WHEN title = 'Untitled project' THEN ${plan.project_title} ELSE title END, updated_at = now() WHERE id = ${projectId}::uuid`;
    await sql`UPDATE generation_jobs SET status = 'succeeded', progress = 100, completed_at = now(), updated_at = now() WHERE id = ${jobId}::uuid`;
    await sql`UPDATE agent_runs SET status = 'succeeded', output_summary = ${JSON.stringify({ sceneCount: createdScenes.length, totalSeconds: total })}::jsonb, completed_at = now() WHERE id = ${agentRunId}::uuid`;
    return NextResponse.json({ jobId, scenes: createdScenes, totalSeconds: existingTotal + total, model: generated.model, provider: generated.provider, creativeOptions, selectedPlatform: director.selectedPlatform }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI storyboard generation failed.";
    if (sql && jobId) {
      try { await sql`UPDATE generation_jobs SET status = 'failed', error_code = 'storyboard_generation_failed', error_message = ${message.slice(0, 500)}, completed_at = now(), updated_at = now() WHERE id = ${jobId}::uuid`; } catch {}
    }
    if (sql && agentRunId) {
      try { await sql`UPDATE agent_runs SET status = 'failed', error_message = ${message.slice(0, 500)}, completed_at = now() WHERE id = ${agentRunId}::uuid`; } catch {}
    }
    const isConfigurationError = message.includes("not configured");
    const isDurationError = message.includes("seconds remaining") || message.includes("duration limit") || message.includes("target duration");
    const status = isConfigurationError ? 503 : isDurationError ? 422 : 502;
    const publicError = isConfigurationError
      ? "A required server configuration is missing. Review deployment settings."
      : isDurationError
        ? message
        : "Storyboard generation failed. Please retry; internal provider and server details are not exposed to the browser.";
    return NextResponse.json({ error: publicError }, { status });
  }
}
