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
import { processImage, isImageMime, buildVariantSet } from './optimize';
import { insertMedia, deleteMedia as deleteMediaRecord, getMediaById } from './queries';
import {
  FileValidationSchema,
  type Media,
  type MediaUploadMeta,
  type MediaVariantSet,
} from './types';

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

const FORMAT_EXT: Record<'webp' | 'avif' | 'jpeg', string> = {
  webp: '.webp',
  avif: '.avif',
  jpeg: '.jpg',
};

const FORMAT_MIME: Record<'webp' | 'avif' | 'jpeg', string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
};

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

  // Non-image: direct upload, no processing
  if (!isImageMime(input.mimeType)) {
    const filename = `${fileId}${ext}`;
    const r2Key = buildR2Key(input.tenantId, filename);

    await uploadToR2(r2Client, r2Config.bucket, r2Key, input.buffer, input.mimeType, {
      'original-name': encodeURIComponent(input.originalName),
      'tenant-id': input.tenantId,
    });

    const media = await insertMedia(supabase, {
      tenant_id: input.tenantId,
      filename,
      original_name: input.originalName,
      mime_type: input.mimeType,
      size_bytes: input.buffer.length,
      r2_key: r2Key,
      r2_bucket: r2Config.bucket,
      url: buildPublicUrl(r2Config, r2Key),
      alt_text: input.meta?.alt_text ?? null,
      width: null,
      height: null,
      blurhash: null,
      variants: null,
      metadata: input.meta?.metadata ?? {},
      created_by: input.userId,
    });

    return { media, thumbnailUrl: null };
  }

  // Image: full processing pipeline
  const processed = await processImage(input.buffer, input.mimeType);

  // Upload master (full-size WebP) — reference URL
  const masterFilename = `${fileId}.webp`;
  const masterKey = buildR2Key(input.tenantId, masterFilename);
  await uploadToR2(
    r2Client,
    r2Config.bucket,
    masterKey,
    processed.master.buffer,
    'image/webp',
    {
      'original-name': encodeURIComponent(input.originalName),
      'tenant-id': input.tenantId,
    }
  );

  // Upload all variants in parallel
  const variantUploads = processed.variants.map(async (v) => {
    const ext = FORMAT_EXT[v.format];
    const key = buildR2Key(
      input.tenantId,
      `${fileId}_${v.key}${ext}`
    );
    await uploadToR2(
      r2Client,
      r2Config.bucket,
      key,
      v.buffer,
      FORMAT_MIME[v.format]
    );
    return {
      ...v,
      url: buildPublicUrl(r2Config, key),
      sizeBytes: v.buffer.length,
    };
  });

  const uploadedVariants = await Promise.all(variantUploads);
  const variantSet: MediaVariantSet = buildVariantSet(uploadedVariants);

  // Thumbnail URL for backward compat
  const thumbnailUrl = variantSet.thumb?.webp?.url ?? null;

  const media = await insertMedia(supabase, {
    tenant_id: input.tenantId,
    filename: masterFilename,
    original_name: input.originalName,
    mime_type: 'image/webp',
    size_bytes: processed.master.buffer.length,
    r2_key: masterKey,
    r2_bucket: r2Config.bucket,
    url: buildPublicUrl(r2Config, masterKey),
    alt_text: input.meta?.alt_text ?? null,
    width: processed.master.width,
    height: processed.master.height,
    blurhash: processed.blurhash,
    variants: variantSet,
    metadata: {
      ...(input.meta?.metadata ?? {}),
      original_width: processed.originalWidth,
      original_height: processed.originalHeight,
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

  // Collect all keys: master + all variants
  const keys: string[] = [media.r2_key];

  if (media.variants) {
    for (const tier of Object.values(media.variants)) {
      if (!tier) continue;
      for (const v of Object.values(tier)) {
        if (!v) continue;
        const key = v.url.replace(`${r2Config.publicUrl}/`, '');
        keys.push(key);
      }
    }
  }

  // Parallel delete, tolerate missing objects
  await Promise.all(
    keys.map((k) =>
      deleteFromR2(r2Client, r2Config.bucket, k).catch(() => undefined)
    )
  );

  await deleteMediaRecord(supabase, mediaId);
}
