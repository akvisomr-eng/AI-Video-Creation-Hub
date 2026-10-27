import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const appUserId = await getOrCreateAppUser(user);
    const sql = getDb();
    const projects = await sql`
      SELECT p.id, p.title, p.description, p.project_type, p.status, p.created_at, p.updated_at,
        (SELECT count(*)::int FROM storyboard_scenes s WHERE s.project_id = p.id) AS scene_count,
        (SELECT count(*)::int FROM media_assets a WHERE a.project_id = p.id) AS asset_count,
        (SELECT count(*)::int FROM generation_jobs j WHERE j.project_id = p.id) AS job_count
      FROM creative_projects p
      WHERE p.user_id = ${appUserId}
      ORDER BY p.updated_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project list failed.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not load projects." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim().slice(0, 100) : "";
    const description = typeof input.description === "string" ? input.description.trim().slice(0, 1000) : null;
    const type = input.projectType;
    if (!title) return NextResponse.json({ error: "Project title is required." }, { status: 400 });
    if (!["image", "video", "campaign", "edit"].includes(String(type))) {
      return NextResponse.json({ error: "Project type must be image, video, campaign, or edit." }, { status: 400 });
    }
    const appUserId = await getOrCreateAppUser(user);
    const sql = getDb();
    const rows = await sql`
      INSERT INTO creative_projects (user_id, title, description, project_type)
      VALUES (${appUserId}, ${title}, ${description}, ${String(type)})
      RETURNING id, title, description, project_type, status, created_at, updated_at
    `;
    return NextResponse.json({ project: rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project creation failed.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not create project." }, { status });
  }
}
