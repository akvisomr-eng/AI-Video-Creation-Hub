import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; sceneId: string }> };

async function authorize(projectId: string, sceneId: string) {
  const user = await requireSession();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  const appUserId = await getOrCreateAppUser(user);
  const sql = getDb();
  const rows = await sql`
    SELECT s.id, s.project_id, s.scene_order, s.title, s.prompt, s.narration_text, s.duration_seconds
    FROM storyboard_scenes s
    INNER JOIN creative_projects p ON p.id = s.project_id
    WHERE s.id = ${sceneId}::uuid AND s.project_id = ${projectId}::uuid AND p.user_id = ${appUserId}
  `;
  if (!rows.length) return { ok: false as const, response: NextResponse.json({ error: "Scene not found." }, { status: 404 }) };
  return { ok: true as const, sql, scene: rows[0] };
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, sceneId } = await context.params;
    const auth = await authorize(id, sceneId);
    if (!auth.ok) return auth.response;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) || null : null;
    const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 4000) : "";
    const narration = typeof input.narrationText === "string" ? input.narrationText.trim().slice(0, 2000) || null : null;
    const duration = Number(input.durationSeconds);
    if (!prompt) return NextResponse.json({ error: "Scene prompt is required." }, { status: 400 });
    if (!Number.isFinite(duration) || duration <= 0 || duration > 30) return NextResponse.json({ error: "Scene duration must be greater than 0 and at most 30 seconds." }, { status: 400 });
    const totals = await auth.sql`SELECT COALESCE(sum(duration_seconds), 0)::numeric AS total FROM storyboard_scenes WHERE project_id = ${id}::uuid AND id <> ${sceneId}::uuid`;
    const total = Number(totals[0].total);
    if (total + duration > 30) return NextResponse.json({ error: `Storyboard is limited to 30 seconds. Other scenes total: ${total.toFixed(1)}s.` }, { status: 422 });
    const rows = await auth.sql`
      UPDATE storyboard_scenes SET title = ${title}, prompt = ${prompt}, narration_text = ${narration}, duration_seconds = ${duration}, updated_at = now()
      WHERE id = ${sceneId}::uuid AND project_id = ${id}::uuid
      RETURNING id, scene_order, title, prompt, narration_text, duration_seconds, visual_style, transition, status, created_at, updated_at
    `;
    await auth.sql`UPDATE creative_projects SET updated_at = now() WHERE id = ${id}::uuid`;
    return NextResponse.json({ scene: rows[0], totalSeconds: total + duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update scene.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not update scene." }, { status });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id, sceneId } = await context.params;
    const auth = await authorize(id, sceneId);
    if (auth.response) return auth.response;
    await auth.sql`DELETE FROM storyboard_scenes WHERE id = ${sceneId}::uuid AND project_id = ${id}::uuid`;
    await auth.sql`UPDATE storyboard_scenes SET scene_order = scene_order + 1000 WHERE project_id = ${id}::uuid`;
    await auth.sql`
      WITH ordered AS (
        SELECT id, row_number() OVER (ORDER BY scene_order, created_at) - 1 AS next_order
        FROM storyboard_scenes WHERE project_id = ${id}::uuid
      )
      UPDATE storyboard_scenes s SET scene_order = ordered.next_order, updated_at = now()
      FROM ordered WHERE s.id = ordered.id
    `;
    const totals = await auth.sql`SELECT COALESCE(sum(duration_seconds), 0)::numeric AS total FROM storyboard_scenes WHERE project_id = ${id}::uuid`;
    await auth.sql`UPDATE creative_projects SET updated_at = now() WHERE id = ${id}::uuid`;
    return NextResponse.json({ success: true, totalSeconds: Number(totals[0].total) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete scene.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not delete scene." }, { status });
  }
}
