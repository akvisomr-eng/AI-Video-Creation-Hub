import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";
import { getStorageClient, MEDIA_BUCKET } from "@/lib/storage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const appUserId = await getOrCreateAppUser(user);
    const { id } = await context.params;
    const sql = getDb();
    const rows = await sql`
      SELECT storage_key, file_name, mime_type
      FROM media_assets
      WHERE id = ${id}::uuid AND user_id = ${appUserId} AND storage_provider = 'neon'
      LIMIT 1
    `;
    if (!rows.length || !rows[0].storage_key) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
    const url = await getSignedUrl(getStorageClient(), new GetObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: String(rows[0].storage_key),
      ResponseContentDisposition: `attachment; filename="${String(rows[0].file_name ?? "download").replace(/["\\\\\r\n]/g, "_")}"`,
      ResponseContentType: String(rows[0].mime_type ?? "application/octet-stream"),
    }), { expiresIn: 300 });
    return NextResponse.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create a download link.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not create a download link." }, { status });
  }
}
