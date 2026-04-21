'use client'

import { CookieBanner } from './cookie-banner'

interface CookieBannerWrapperProps {
  orgSlug?: string
  policyVersion?: string
}

export function CookieBannerWrapper({ orgSlug, policyVersion = '2026-04-22' }: CookieBannerWrapperProps) {
  return <CookieBanner orgSlug={orgSlug} policyVersion={policyVersion} />
}
