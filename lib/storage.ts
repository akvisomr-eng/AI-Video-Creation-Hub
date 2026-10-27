import { S3Client } from "@aws-sdk/client-s3";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_USER_STORAGE_BYTES = 250 * 1024 * 1024;
export const MAX_UPLOAD_URLS_PER_DAY = 20;
export const MEDIA_BUCKET = process.env.NEON_STORAGE_BUCKET || "creator-media";

export function getStorageClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
    throw new Error("Neon Object Storage is not configured. Set the AWS-compatible storage environment variables for the same Neon branch.");
  }
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function classifyAsset(mimeType: string): "image" | "video" | "audio" | "subtitle" | null {
  if (["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(mimeType)) return "image";
  if (["video/mp4", "video/webm", "video/quicktime"].includes(mimeType)) return "video";
  if (["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"].includes(mimeType)) return "audio";
  if (["text/vtt", "application/x-subrip", "text/plain"].includes(mimeType)) return "subtitle";
  return null;
}

export function sanitizeFileName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120);
  return cleaned || "upload.bin";
}
