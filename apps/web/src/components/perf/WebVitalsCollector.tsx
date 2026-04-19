'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'

const COOKIE_CONSENT_KEY = 'touracore_cookie_consent'

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { preferences?: { analytics?: boolean } }
    return parsed.preferences?.analytics === true
  } catch {
    return false
  }
}

function detectDeviceType(): string {
  const ua = navigator.userAgent
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

function sendMetric(metric: Metric) {
  if (!hasAnalyticsConsent()) return

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    route: window.location.pathname,
    device_type: detectDeviceType(),
    connection_effective_type: (navigator as unknown as {
      connection?: { effectiveType?: string }
    }).connection?.effectiveType ?? null,
  })

  // sendBeacon for reliability on pagehide
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body)
  } else {
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // silent
    })
  }
}

export function WebVitalsCollector() {
  useEffect(() => {
    onCLS(sendMetric)
    onINP(sendMetric)
    onLCP(sendMetric)
    onFCP(sendMetric)
    onTTFB(sendMetric)
  }, [])
  return null
}
