import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import {
  MAX_IMAGE_DIMENSION,
  VARIANT_SIZES,
  VARIANT_QUALITY,
  isImageMime,
  type VariantKey,
  type MediaVariant,
  type MediaVariantSet,
} from './types';

export { isImageMime };

export interface OptimizeResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

export interface ProcessedVariantBuffer {
  key: VariantKey;
  format: 'webp' | 'avif' | 'jpeg';
  buffer: Buffer;
  width: number;
  height: number;
}

export interface FullProcessResult {
  master: OptimizeResult; // full-size master (WebP q90)
  variants: ProcessedVariantBuffer[]; // all tiers × 3 formats
  blurhash: string | null;
  originalWidth: number;
  originalHeight: number;
}

// Shared sharp pipeline: sRGB color profile + auto-orient EXIF
function basePipeline(input: Buffer): sharp.Sharp {
  return sharp(input, { failOn: 'none' })
    .rotate() // apply EXIF orientation
    .toColorspace('srgb')
    .withMetadata({ density: 72 }); // preserve metadata but normalize DPI
}

// Generate BlurHash from a tiny preview — LCP placeholder
async function generateBlurhash(input: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(input)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    return encodeBlurhash(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      4
    );
  } catch {
    return null;
  }
}

// Produce single variant (size + format combo)
async function encodeVariant(
  input: Buffer,
  key: VariantKey,
  format: 'webp' | 'avif' | 'jpeg'
): Promise<ProcessedVariantBuffer> {
  const size = VARIANT_SIZES[key];
  const quality = VARIANT_QUALITY[format][key];

  let pipe = basePipeline(input).resize(size, size, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (format === 'webp') {
    pipe = pipe.webp({ quality, effort: 5, smartSubsample: true });
  } else if (format === 'avif') {
    pipe = pipe.avif({ quality, effort: 5, chromaSubsampling: '4:2:0' });
  } else {
    pipe = pipe.jpeg({ quality, mozjpeg: true, progressive: true });
  }

  const result = await pipe.toBuffer({ resolveWithObject: true });
  return {
    key,
    format,
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

// Full processing: master + 4 tiers × 3 formats + blurhash
export async function processImage(
  input: Buffer,
  mimeType: string
): Promise<FullProcessResult> {
  if (!isImageMime(mimeType)) {
    throw new Error(`Non-image MIME type: ${mimeType}`);
  }

  // SVG passthrough (vector, no processing)
  if (mimeType === 'image/svg+xml') {
    return {
      master: { buffer: input, width: 0, height: 0, format: 'svg' },
      variants: [],
      blurhash: null,
      originalWidth: 0,
      originalHeight: 0,
    };
  }

  // GIF passthrough (preserve animation)
  if (mimeType === 'image/gif') {
    const meta = await sharp(input).metadata();
    return {
      master: {
        buffer: input,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: 'gif',
      },
      variants: [],
      blurhash: null,
      originalWidth: meta.width ?? 0,
      originalHeight: meta.height ?? 0,
    };
  }

  const metadata = await sharp(input).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  // Master: full-size WebP at top quality — source of truth
  const masterPipe = basePipeline(input).resize(
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_DIMENSION,
    { fit: 'inside', withoutEnlargement: true }
  ).webp({ quality: 92, effort: 6, smartSubsample: true });

  const masterOut = await masterPipe.toBuffer({ resolveWithObject: true });
  const master: OptimizeResult = {
    buffer: masterOut.data,
    width: masterOut.info.width,
    height: masterOut.info.height,
    format: 'webp',
  };

  // Parallel variants generation
  const tiers: VariantKey[] = ['thumb', 'card', 'hero', 'full'];
  const formats: Array<'webp' | 'avif' | 'jpeg'> = ['webp', 'avif', 'jpeg'];

  const variantPromises: Promise<ProcessedVariantBuffer>[] = [];
  for (const tier of tiers) {
    // Skip variants larger than source to avoid upscale waste
    if (VARIANT_SIZES[tier] > Math.max(originalWidth, originalHeight) * 1.1 && tier !== 'thumb') {
      continue;
    }
    for (const fmt of formats) {
      variantPromises.push(encodeVariant(input, tier, fmt));
    }
  }

  const [variants, blurhash] = await Promise.all([
    Promise.all(variantPromises),
    generateBlurhash(input),
  ]);

  return {
    master,
    variants,
    blurhash,
    originalWidth,
    originalHeight,
  };
}

// Assemble variant set from uploaded results (needs URL per variant)
export function buildVariantSet(
  variants: Array<ProcessedVariantBuffer & { url: string; sizeBytes: number }>
): MediaVariantSet {
  const set: MediaVariantSet = {};
  for (const v of variants) {
    if (!set[v.key]) set[v.key] = {};
    const entry: MediaVariant = {
      url: v.url,
      format: v.format,
      width: v.width,
      height: v.height,
      size_bytes: v.sizeBytes,
    };
    set[v.key]![v.format] = entry;
  }
  return set;
}

// Legacy compatibility — kept for gradual migration
export async function optimizeImage(
  input: Buffer,
  mimeType: string
): Promise<OptimizeResult> {
  const result = await processImage(input, mimeType);
  return result.master;
}

export async function generateThumbnail(
  input: Buffer,
  mimeType: string
): Promise<OptimizeResult | null> {
  if (!isImageMime(mimeType) || mimeType === 'image/svg+xml') {
    return null;
  }
  const variant = await encodeVariant(input, 'thumb', 'webp');
  return {
    buffer: variant.buffer,
    width: variant.width,
    height: variant.height,
    format: 'webp',
  };
}
