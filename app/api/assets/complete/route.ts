import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";
import { classifyAsset, getStorageClient, MAX_UPLOAD_BYTES, MEDIA_BUCKET } from "@/lib/storage";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const storageKey = typeof input.storageKey === "string" ? input.storageKey : "";
    const fileName = typeof input.fileName === "string" ? input.fileName.slice(0, 255) : "";
    const mimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
    const projectId = typeof input.projectId === "string" ? input.projectId : null;
    if (!storageKey || !fileName || !classifyAsset(mimeType)) return NextResponse.json({ error: "Missing or invalid upload metadata." }, { status: 400 });
    if (projectId && !UUID.test(projectId)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });

    const appUserId = await getOrCreateAppUser(user);
    if (!storageKey.startsWith(`users/${appUserId}/`) || storageKey.includes("..")) {
      return NextResponse.json({ error: "Storage key does not belong to this account." }, { status: 403 });
    }
    const sql = getDb();
    if (projectId) {
      const owned = await sql`SELECT id FROM creative_projects WHERE id = ${projectId}::uuid AND user_id = ${appUserId}`;
      if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const client = getStorageClient();
    const head = await client.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: storageKey }));
    const actualSize = Number(head.ContentLength ?? 0);
    const actualMime = (head.ContentType ?? "").toLowerCase();
    if (!actualSize || actualSize > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Uploaded object is empty or exceeds the 50 MB limit." }, { status: 413 });
    if (actualMime !== mimeType) return NextResponse.json({ error: "Uploaded content type does not match the declared file type." }, { status: 422 });

    const assetType = classifyAsset(actualMime);
    if (!assetType) return NextResponse.json({ error: "Unsupported media type." }, { status: 415 });
    const rows = await sql`
      INSERT INTO media_assets (user_id, project_id, asset_type, storage_provider, storage_key, mime_type, file_name, file_size_bytes, moderation_state, metadata)
      VALUES (${appUserId}, ${projectId}::uuid, ${assetType}, 'neon', ${storageKey}, ${actualMime}, ${fileName}, ${actualSize}, 'pending', '{}'::jsonb)
      RETURNING id, project_id, asset_type, file_name, mime_type, file_size_bytes, moderation_state, created_at
    `;
    return NextResponse.json({ asset: rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register uploaded media.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not register uploaded media. Verify the upload and try again." }, { status });
  }
}
