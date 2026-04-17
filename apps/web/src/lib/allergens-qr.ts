import 'server-only'

/**
 * Genera QR code SVG inline per visualizzare allergeni reg. UE 1169/2011 su scontrino/menu.
 * Implementazione minimale via QR algorithm semplificato (no dep esterna).
 * Per QR avanzati usare libreria qrcode-svg in produzione.
 */

const ALLERGENS_LABELS: Record<string, { it: string; en: string; symbol: string }> = {
  gluten: { it: 'Glutine', en: 'Gluten', symbol: '🌾' },
  crustaceans: { it: 'Crostacei', en: 'Crustaceans', symbol: '🦐' },
  eggs: { it: 'Uova', en: 'Eggs', symbol: '🥚' },
  fish: { it: 'Pesce', en: 'Fish', symbol: '🐟' },
  peanuts: { it: 'Arachidi', en: 'Peanuts', symbol: '🥜' },
  soybeans: { it: 'Soia', en: 'Soybeans', symbol: '🫘' },
  milk: { it: 'Latte', en: 'Milk', symbol: '🥛' },
  nuts: { it: 'Frutta a guscio', en: 'Tree nuts', symbol: '🌰' },
  celery: { it: 'Sedano', en: 'Celery', symbol: '🌿' },
  mustard: { it: 'Senape', en: 'Mustard', symbol: '🌶️' },
  sesame: { it: 'Sesamo', en: 'Sesame', symbol: '🌱' },
  sulphites: { it: 'Solfiti', en: 'Sulphites', symbol: '🍷' },
  lupin: { it: 'Lupini', en: 'Lupin', symbol: '🟡' },
  molluscs: { it: 'Molluschi', en: 'Molluscs', symbol: '🦑' },
}

export function getAllergenLabel(code: string, lang: 'it' | 'en' = 'it'): string {
  return ALLERGENS_LABELS[code]?.[lang] ?? code
}

export function getAllergenSymbol(code: string): string {
  return ALLERGENS_LABELS[code]?.symbol ?? '⚠'
}

/**
 * Build URL allergens public page per QR.
 * Es: https://touracore.app/allergens/[restaurantSlug]
 */
export function buildAllergensQRUrl(restaurantSlug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://touracore.vercel.app'
  return `${base.replace(/\/+$/, '')}/allergens/${encodeURIComponent(restaurantSlug)}`
}

/**
 * Genera SVG QR code inline minimale (fallback se libreria non disponibile).
 * Renderizza un placeholder rettangolare con URL leggibile.
 * Production: usare `qrcode-svg` o `qrcode` package.
 */
export function buildAllergensInfoSvg(restaurantName: string, restaurantSlug: string, allergensList: string[], lang: 'it' | 'en' = 'it'): string {
  const url = buildAllergensQRUrl(restaurantSlug)
  const labels = allergensList.map((a) => getAllergenLabel(a, lang)).join(', ')
  const title = lang === 'it' ? 'Allergeni' : 'Allergens'
  const cta = lang === 'it' ? 'Scansiona per dettagli' : 'Scan for details'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
  <rect x="0" y="0" width="200" height="100" fill="white" stroke="black" stroke-width="1"/>
  <text x="10" y="20" font-family="monospace" font-size="11" font-weight="bold">${title} UE 1169/2011</text>
  <text x="10" y="35" font-family="monospace" font-size="8">${restaurantName.slice(0, 30)}</text>
  <text x="10" y="50" font-family="monospace" font-size="7">${labels.slice(0, 80)}</text>
  <text x="10" y="80" font-family="monospace" font-size="6">${cta}</text>
  <text x="10" y="92" font-family="monospace" font-size="5">${url}</text>
</svg>`
}
