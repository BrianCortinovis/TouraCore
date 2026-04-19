// Google Consent Mode v2 + Meta Pixel gating
// Obbligo Google EEA dal 2024-03-06

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export const CONSENT_DEFAULT_DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500,
} as const;

// Generate gtag consent default script — inject <head> BEFORE gtag load
export function buildGtagDefaultScript(): string {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', ${JSON.stringify(CONSENT_DEFAULT_DENIED)});
  `.trim();
}

// Map user consent prefs → gtag consent update
export function toGtagUpdate(prefs: ConsentState): Record<string, 'granted' | 'denied'> {
  return {
    ad_storage: prefs.marketing ? 'granted' : 'denied',
    ad_user_data: prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
  };
}

export function hasAnalyticsConsent(prefs: ConsentState): boolean {
  return prefs.analytics === true;
}

export function hasMarketingConsent(prefs: ConsentState): boolean {
  return prefs.marketing === true;
}
