import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_ENDPOINT_URL_S3", "AWS_REGION"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable names: ${missing.join(", ")}`);
  process.exit(1);
}

const bucket = process.env.NEON_STORAGE_BUCKET || "creator-media";
const origins = ["http://localhost:3000", "https://*.vercel.app"];
if (process.env.APP_ORIGIN) origins.push(process.env.APP_ORIGIN);

const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

await client.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: [...new Set(origins)],
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["content-type", "x-amz-*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));
console.log(`CORS policy configured for private bucket "${bucket}". Object access still requires signed URLs.`);
