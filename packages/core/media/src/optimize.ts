import sharp from 'sharp';
import { MAX_IMAGE_DIMENSION, THUMBNAIL_SIZE, isImageMime } from './types';

export { isImageMime };

export interface OptimizeResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

export async function optimizeImage(
  input: Buffer,
  mimeType: string
): Promise<OptimizeResult> {
  if (!isImageMime(mimeType)) {
    throw new Error(`Non-image MIME type: ${mimeType}`);
  }

  if (mimeType === 'image/svg+xml') {
    return {
      buffer: input,
      width: 0,
      height: 0,
      format: 'svg',
    };
  }

  const image = sharp(input);
  const metadata = await image.metadata();

  const needsResize =
    (metadata.width ?? 0) > MAX_IMAGE_DIMENSION ||
    (metadata.height ?? 0) > MAX_IMAGE_DIMENSION;

  let pipeline = image;

  if (needsResize) {
    pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (mimeType === 'image/gif') {
    const result = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: 'gif',
    };
  }

  const result = await pipeline
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    format: 'webp',
  };
}

export async function generateThumbnail(
  input: Buffer,
  mimeType: string
): Promise<OptimizeResult | null> {
  if (!isImageMime(mimeType) || mimeType === 'image/svg+xml') {
    return null;
  }

  const result = await sharp(input)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 70 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    format: 'webp',
  };
}
