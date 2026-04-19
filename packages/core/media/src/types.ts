import { z } from 'zod';

// MIME consentiti — estesi per foto pro
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;

// Limiti: 50MB per RAW/large photo
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2560; // retina 5K friendly

// Variant tiers — progressive responsive
export const VARIANT_SIZES = {
  thumb: 320,
  card: 640,
  hero: 1280,
  full: 2560,
} as const;

export type VariantKey = keyof typeof VARIANT_SIZES;

// Quality per tier — higher on larger sizes
export const VARIANT_QUALITY = {
  webp: { thumb: 78, card: 82, hero: 86, full: 90 },
  avif: { thumb: 60, card: 65, hero: 70, full: 75 },
  jpeg: { thumb: 80, card: 84, hero: 88, full: 92 },
} as const;

export const THUMBNAIL_SIZE = VARIANT_SIZES.thumb;

export const MediaUploadMetaSchema = z.object({
  alt_text: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MediaUploadMeta = z.infer<typeof MediaUploadMetaSchema>;

export const FileValidationSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().min(1).max(MAX_FILE_SIZE),
  type: z.string().refine(
    (t) => (ALLOWED_MIME_TYPES as readonly string[]).includes(t),
    { message: 'Tipo file non consentito' }
  ),
});

export type FileValidation = z.infer<typeof FileValidationSchema>;

export const MediaQuerySchema = z.object({
  tenant_id: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(24),
  mime_filter: z.string().optional(),
  search: z.string().max(100).optional(),
});

export type MediaQuery = z.infer<typeof MediaQuerySchema>;

// Single variant: URL + format + dimensioni
export interface MediaVariant {
  url: string;
  format: 'webp' | 'avif' | 'jpeg';
  width: number;
  height: number;
  size_bytes: number;
}

// Set of variants per size tier
export type MediaVariantSet = Partial<Record<VariantKey, {
  webp?: MediaVariant;
  avif?: MediaVariant;
  jpeg?: MediaVariant;
}>>;

export interface Media {
  id: string;
  tenant_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  r2_key: string;
  r2_bucket: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  variants: MediaVariantSet | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface MediaUploadResult {
  media: Media;
  thumbnail_url: string | null;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

export function isImageMime(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}
