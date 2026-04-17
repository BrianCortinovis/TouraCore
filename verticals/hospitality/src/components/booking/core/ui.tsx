'use client'

import { type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, forwardRef } from 'react'

/**
 * UI primitives theme-aware. Consumano CSS vars --bk-accent, --bk-text, --bk-muted, --bk-radius.
 * Usabili da tutti i template. Nessuna dipendenza da Tailwind: inline style + CSS vars.
 */

export function BkButton({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  style,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
} & Omit<HTMLAttributes<HTMLButtonElement>, 'color'> & {
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const padding = size === 'sm' ? '6px 12px' : size === 'lg' ? '14px 24px' : '10px 18px'
  const fontSize = size === 'sm' ? '13px' : size === 'lg' ? '17px' : '15px'
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding,
    fontSize,
    fontWeight: 600,
    borderRadius: 'var(--bk-radius)',
    cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
    opacity: props.disabled || loading ? 0.6 : 1,
    transition: 'all 120ms ease',
    border: 'none',
    fontFamily: 'inherit',
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'var(--bk-accent)', color: '#fff' },
    secondary: { background: 'var(--bk-text)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--bk-accent)' },
    outline: { background: 'transparent', color: 'var(--bk-accent)', border: '1px solid var(--bk-accent)' },
  }
  return (
    <button {...props} style={{ ...base, ...variants[variant], ...style }}>
      {loading ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'bk-spin 0.6s linear infinite' }} /> : null}
      {children}
    </button>
  )
}

export const BkInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function BkInput(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 15,
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--bk-radius)',
          outline: 'none',
          fontFamily: 'inherit',
          color: 'var(--bk-text)',
          background: '#fff',
          ...props.style,
        }}
      />
    )
  }
)

export function BkCard({ children, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        background: '#fff',
        borderRadius: 'var(--bk-radius)',
        border: '1px solid #e5e7eb',
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function BkBadge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'success' | 'warning' | 'accent'
}) {
  const tones = {
    default: { bg: '#f3f4f6', color: '#374151' },
    success: { bg: '#d1fae5', color: '#065f46' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    accent: { bg: 'var(--bk-accent)', color: '#fff' },
  }
  const t = tones[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 'var(--bk-radius)',
        background: t.bg,
        color: t.color,
      }}
    >
      {children}
    </span>
  )
}

export function BkLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6,
        color: 'var(--bk-text)',
      }}
    >
      {children}
    </label>
  )
}

export function BkSpinKeyframes() {
  return (
    <style>{`@keyframes bk-spin { to { transform: rotate(360deg); } }`}</style>
  )
}
