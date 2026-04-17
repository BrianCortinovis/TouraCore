import type { BookingTheme } from './types'
import { DEFAULT_THEME } from './types'

/**
 * Normalizza theme raw da DB (JSONB) in BookingTheme completo con defaults.
 */
export function normalizeTheme(raw: unknown): BookingTheme {
  const obj = (raw ?? {}) as Record<string, unknown>
  return {
    accent_color: str(obj.accent_color, DEFAULT_THEME.accent_color),
    bg_color: str(obj.bg_color, DEFAULT_THEME.bg_color),
    text_color: str(obj.text_color, DEFAULT_THEME.text_color),
    muted_color: str(obj.muted_color, DEFAULT_THEME.muted_color),
    border_radius: (['none','sm','md','lg','full'] as const).includes(obj.border_radius as never)
      ? (obj.border_radius as BookingTheme['border_radius'])
      : DEFAULT_THEME.border_radius,
    font_family: (['system','serif','display','custom'] as const).includes(obj.font_family as never)
      ? (obj.font_family as BookingTheme['font_family'])
      : DEFAULT_THEME.font_family,
    font_family_custom: typeof obj.font_family_custom === 'string' ? obj.font_family_custom : undefined,
    logo_url: typeof obj.logo_url === 'string' ? obj.logo_url : undefined,
    hero_image_url: typeof obj.hero_image_url === 'string' ? obj.hero_image_url : undefined,
    hero_overlay_opacity: typeof obj.hero_overlay_opacity === 'number'
      ? Math.max(0, Math.min(1, obj.hero_overlay_opacity))
      : DEFAULT_THEME.hero_overlay_opacity,
    show_powered_by: typeof obj.show_powered_by === 'boolean' ? obj.show_powered_by : true,
    custom_css: typeof obj.custom_css === 'string' ? obj.custom_css : undefined,
  }
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback
}

/**
 * Converte tokens in CSS variables per CSS-in-JS o inline style.
 * Usare su <div style={themeToStyle(theme)}> al root del template.
 */
export function themeToStyle(theme: BookingTheme): Record<string, string> {
  const radius = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  }[theme.border_radius]

  const fontStack = {
    system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: '"Playfair Display", Georgia, "Times New Roman", serif',
    display: '"Poppins", "Inter", ui-sans-serif, sans-serif',
    custom: theme.font_family_custom || 'ui-sans-serif, system-ui, sans-serif',
  }[theme.font_family]

  return {
    '--bk-accent': theme.accent_color,
    '--bk-bg': theme.bg_color,
    '--bk-text': theme.text_color,
    '--bk-muted': theme.muted_color,
    '--bk-radius': radius,
    '--bk-font': fontStack,
    fontFamily: fontStack,
    color: theme.text_color,
    backgroundColor: theme.bg_color,
  } as Record<string, string>
}

/**
 * Palette preset per quick-pick UI.
 */
export const THEME_PRESETS: Record<string, Partial<BookingTheme>> = {
  blue: { accent_color: '#2563eb' },
  green: { accent_color: '#059669' },
  amber: { accent_color: '#d97706' },
  rose: { accent_color: '#e11d48' },
  charcoal: { accent_color: '#111827', bg_color: '#fafafa' },
  warm: { accent_color: '#b45309', bg_color: '#fefce8', text_color: '#1c1917' },
  navy: { accent_color: '#1e3a8a', bg_color: '#ffffff' },
  ocean: { accent_color: '#0e7490' },
}
