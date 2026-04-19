import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config } from './types';

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function getR2Config(): R2Config {
  const accountId = process.env['R2_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  const bucket = process.env['R2_BUCKET'] ?? 'touracore-media';
  const publicUrl = process.env['R2_PUBLIC_URL'] ?? '';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 credentials missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export interface UploadOptions {
  cacheControl?: string;
  contentDisposition?: string;
}

// Default 1-year immutable — content-addressed filenames make this safe
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export async function uploadToR2(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  metadata?: Record<string, string>,
  options?: UploadOptions
): Promise<void> {
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
    CacheControl: options?.cacheControl ?? DEFAULT_CACHE_CONTROL,
    ContentDisposition: options?.contentDisposition,
  };

  await client.send(new PutObjectCommand(params));
}

// Presigned PUT — client uploads direct to R2, skip Vercel 4.5MB body limit
export async function getPresignedUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const { PutObjectCommand: PutCmd } = await import('@aws-sdk/client-s3');
  const command = new PutCmd({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromR2(
  client: S3Client,
  bucket: string,
  key: string
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function getPresignedUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function objectExists(
  client: S3Client,
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function buildR2Key(tenantId: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${tenantId}/${year}/${month}/${filename}`;
}

export function buildPublicUrl(config: R2Config, key: string): string {
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }
  return `https://${config.bucket}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
}
