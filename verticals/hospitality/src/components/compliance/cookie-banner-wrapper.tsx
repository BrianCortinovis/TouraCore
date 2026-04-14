'use client'

import { CookieBanner } from './cookie-banner'

export function CookieBannerWrapper({ orgSlug }: { orgSlug: string }) {
  return <CookieBanner orgSlug={orgSlug} />
}
