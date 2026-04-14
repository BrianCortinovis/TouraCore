import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import {
  createR2Client,
  getR2Config,
  uploadToR2,
  deleteFromR2,
  buildR2Key,
  buildPublicUrl,
} from './r2-client';
import { optimizeImage, generateThumbnail, isImageMime } from './optimize';
import { insertMedia, deleteMedia as deleteMediaRecord, getMediaById } from './queries';
import { FileValidationSchema, type Media, type MediaUploadMeta } from './types';

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  tenantId: string;
  userId: string;
  meta?: MediaUploadMeta;
}

export interface UploadResult {
  media: Media;
  thumbnailUrl: string | null;
}

export async function uploadFile(
  supabase: SupabaseClient,
  input: UploadFileInput
): Promise<UploadResult> {
  const validation = FileValidationSchema.safeParse({
    name: input.originalName,
    size: input.size,
    type: input.mimeType,
  });

  if (!validation.success) {
    throw new Error(
      `Validazione file fallita: ${validation.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  const r2Config = getR2Config();
  const r2Client = createR2Client(r2Config);

  const fileId = randomUUID();
  const ext = extname(input.originalName).toLowerCase();
  let finalBuffer = input.buffer;
  let finalMime = input.mimeType;
  let width: number | null = null;
  let height: number | null = null;
  let finalExt = ext;

  if (isImageMime(input.mimeType)) {
    const optimized = await optimizeImage(input.buffer, input.mimeType);
    finalBuffer = optimized.buffer;
    width = optimized.width;
    height = optimized.height;

    if (optimized.format === 'webp') {
      finalMime = 'image/webp';
      finalExt = '.webp';
    }
  }

  const filename = `${fileId}${finalExt}`;
  const r2Key = buildR2Key(input.tenantId, filename);

  await uploadToR2(r2Client, r2Config.bucket, r2Key, finalBuffer, finalMime, {
    'original-name': input.originalName,
    'tenant-id': input.tenantId,
  });

  let thumbnailUrl: string | null = null;
  if (isImageMime(input.mimeType)) {
    const thumbnail = await generateThumbnail(input.buffer, input.mimeType);
    if (thumbnail) {
      const thumbKey = buildR2Key(input.tenantId, `thumb_${fileId}.webp`);
      await uploadToR2(
        r2Client,
        r2Config.bucket,
        thumbKey,
        thumbnail.buffer,
        'image/webp'
      );
      thumbnailUrl = buildPublicUrl(r2Config, thumbKey);
    }
  }

  const media = await insertMedia(supabase, {
    tenant_id: input.tenantId,
    filename,
    original_name: input.originalName,
    mime_type: finalMime,
    size_bytes: finalBuffer.length,
    r2_key: r2Key,
    r2_bucket: r2Config.bucket,
    url: buildPublicUrl(r2Config, r2Key),
    alt_text: input.meta?.alt_text ?? null,
    width,
    height,
    metadata: {
      ...(input.meta?.metadata ?? {}),
      ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    },
    created_by: input.userId,
  });

  return { media, thumbnailUrl };
}

export async function deleteFile(
  supabase: SupabaseClient,
  mediaId: string
): Promise<void> {
  const media = await getMediaById(supabase, mediaId);
  if (!media) {
    throw new Error(`Media non trovato: ${mediaId}`);
  }

  const r2Config = getR2Config();
  const r2Client = createR2Client(r2Config);

  await deleteFromR2(r2Client, r2Config.bucket, media.r2_key);

  const thumbnailUrl = (media.metadata as Record<string, unknown>)?.['thumbnail_url'];
  if (typeof thumbnailUrl === 'string') {
    const thumbKey = thumbnailUrl.replace(`${r2Config.publicUrl}/`, '');
    try {
      await deleteFromR2(r2Client, r2Config.bucket, thumbKey);
    } catch {
      // Thumbnail cleanup non-critico
    }
  }

  await deleteMediaRecord(supabase, mediaId);
}
