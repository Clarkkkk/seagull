import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadKind = "image" | "cover";

type UploadRequest = {
  keyPrefix: string;
  contentType: string;
  kind: UploadKind;
};

type UploadResult = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

type StorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
};

let cachedClient: S3Client | null = null;
let cachedConfig: StorageConfig | null = null;

function getStorageConfig(): StorageConfig {
  if (cachedConfig) return cachedConfig;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing S3 storage configuration",
    });
  }

  cachedConfig = {
    bucket,
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false") === "true",
  };
  return cachedConfig;
}

function getS3Client() {
  if (cachedClient) return cachedClient;
  const config = getStorageConfig();
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

function normalizePublicUrl(base: string, key: string) {
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmed}/${key}`;
}

function extensionFromContentType(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

export async function requestPresignedUpload({
  keyPrefix,
  contentType,
  kind,
}: UploadRequest): Promise<UploadResult> {
  const config = getStorageConfig();
  const client = getS3Client();
  const ext = extensionFromContentType(contentType);
  const key = `${keyPrefix}/${kind}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });
  const publicUrl = normalizePublicUrl(config.publicBaseUrl, key);

  return { key, uploadUrl, publicUrl };
}

export async function deleteObject(key: string) {
  const config = getStorageConfig();
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}
