import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const appUserId = await getOrCreateAppUser(user);
    const { id } = await context.params;
    const sql = getDb();
    const owned = await sql`SELECT id FROM creative_projects WHERE id = ${id}::uuid AND user_id = ${appUserId}`;
    if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const scenes = await sql`SELECT id, scene_order, title, prompt, narration_text, duration_seconds, visual_style, transition, status, created_at, updated_at FROM storyboard_scenes WHERE project_id = ${id}::uuid ORDER BY scene_order ASC`;
    return NextResponse.json({ scenes, totalSeconds: scenes.reduce((sum, scene) => sum + Number(scene.duration_seconds), 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load storyboard.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not load storyboard." }, { status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const appUserId = await getOrCreateAppUser(user);
    const { id } = await context.params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : null;
    const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 4000) : "";
    const narration = typeof input.narrationText === "string" ? input.narrationText.trim().slice(0, 2000) : null;
    const duration = Number(input.durationSeconds ?? 5);
    if (!prompt) return NextResponse.json({ error: "Scene prompt is required." }, { status: 400 });
    if (!Number.isFinite(duration) || duration <= 0 || duration > 30) return NextResponse.json({ error: "Scene duration must be greater than 0 and at most 30 seconds." }, { status: 400 });

    const sql = getDb();
    const owned = await sql`SELECT id FROM creative_projects WHERE id = ${id}::uuid AND user_id = ${appUserId}`;
    if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const totals = await sql`SELECT COALESCE(sum(duration_seconds), 0)::numeric AS total, COALESCE(max(scene_order), -1)::int AS max_order FROM storyboard_scenes WHERE project_id = ${id}::uuid`;
    const total = Number(totals[0].total);
    if (total + duration > 30) return NextResponse.json({ error: `Storyboard is limited to 30 seconds. Current total: ${total.toFixed(1)}s.` }, { status: 422 });
    const order = Number(totals[0].max_order) + 1;
    const rows = await sql`
      INSERT INTO storyboard_scenes (project_id, scene_order, title, prompt, narration_text, duration_seconds)
      VALUES (${id}::uuid, ${order}, ${title}, ${prompt}, ${narration}, ${duration})
      RETURNING id, scene_order, title, prompt, narration_text, duration_seconds, status, created_at
    `;
    await sql`UPDATE creative_projects SET updated_at = now() WHERE id = ${id}::uuid`;
    return NextResponse.json({ scene: rows[0], totalSeconds: total + duration }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scene creation failed.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not create scene." }, { status });
  }
}
