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
    const assets = await sql`
      SELECT id, asset_type, file_name, mime_type, file_size_bytes, moderation_state, created_at
      FROM media_assets
      WHERE project_id = ${id}::uuid AND user_id = ${appUserId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load media library.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not load media library." }, { status });
  }
}
