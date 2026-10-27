import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";
import { classifyAsset, getStorageClient, MAX_UPLOAD_BYTES, MAX_USER_STORAGE_BYTES, MAX_UPLOAD_URLS_PER_DAY, MEDIA_BUCKET, sanitizeFileName } from "@/lib/storage";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const fileName = typeof input.fileName === "string" ? input.fileName : "";
    const mimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
    const fileSize = Number(input.fileSize);
    const projectId = typeof input.projectId === "string" ? input.projectId : null;
    if (!fileName || fileName.length > 255) return NextResponse.json({ error: "A valid file name is required." }, { status: 400 });
    if (!classifyAsset(mimeType)) return NextResponse.json({ error: "Unsupported file type. Upload an image, video, audio, or subtitle file." }, { status: 415 });
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File must be between 1 byte and 50 MB." }, { status: 413 });
    if (projectId && !UUID.test(projectId)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });

    const appUserId = await getOrCreateAppUser(user);
    const sql = getDb();
    if (projectId) {
      const owned = await sql`SELECT id FROM creative_projects WHERE id = ${projectId}::uuid AND user_id = ${appUserId}`;
      if (!owned.length) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const quota = await sql`SELECT COALESCE(sum(file_size_bytes), 0)::bigint AS used_bytes, count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS uploads_today FROM media_assets WHERE user_id = ${appUserId}`;
    if (Number(quota[0]?.uploads_today ?? 0) >= MAX_UPLOAD_URLS_PER_DAY) {
      return NextResponse.json({ error: "Upload limit reached for today. Try again tomorrow." }, { status: 429 });
    }
    if (Number(quota[0]?.used_bytes ?? 0) + fileSize > MAX_USER_STORAGE_BYTES) {
      return NextResponse.json({ error: "Free workspace media quota is 250 MB per account. Remove older assets or use a larger plan when available." }, { status: 413 });
    }

    const storageKey = `users/${appUserId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
    const client = getStorageClient();
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: storageKey,
      ContentType: mimeType,
    }), { expiresIn: 300 });

    return NextResponse.json({ uploadUrl, storageKey, expiresInSeconds: 300, maxBytes: MAX_UPLOAD_BYTES });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare upload.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? message : "Could not prepare upload." }, { status });
  }
}
