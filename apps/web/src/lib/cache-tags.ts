import { revalidateTag, updateTag } from 'next/cache'

export const CacheTags = {
  listing: (entityId: string) => `listing:${entityId}`,
  listingBySlug: (tenantSlug: string, entitySlug: string) =>
    `listing-slug:${tenantSlug}/${entitySlug}`,
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantSlug: (tenantSlug: string) => `tenant-slug:${tenantSlug}`,
  discover: 'discover',
  sitemap: 'sitemap',
  media: (entityId: string) => `media:${entityId}`,
} as const

// In server actions prefer updateTag (1-arg, read-your-own-writes).
// In other server contexts (route handlers, cron) use revalidateTag with a default profile.
export function bustTag(tag: string) {
  updateTag(tag)
}

export function bustTagBackground(tag: string) {
  revalidateTag(tag, 'default')
}

export function revalidateListing(opts: {
  entityId?: string
  tenantId?: string
  tenantSlug?: string
  entitySlug?: string
}) {
  if (opts.entityId) bustTag(CacheTags.listing(opts.entityId))
  if (opts.tenantId) bustTag(CacheTags.tenant(opts.tenantId))
  if (opts.tenantSlug) bustTag(CacheTags.tenantSlug(opts.tenantSlug))
  if (opts.tenantSlug && opts.entitySlug) {
    bustTag(CacheTags.listingBySlug(opts.tenantSlug, opts.entitySlug))
  }
  bustTag(CacheTags.discover)
  bustTag(CacheTags.sitemap)
}

export function revalidateMedia(entityId: string) {
  bustTag(CacheTags.media(entityId))
  bustTag(CacheTags.listing(entityId))
  bustTag(CacheTags.discover)
}
