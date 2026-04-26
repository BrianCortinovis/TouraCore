'use client'

/**
 * Indicator forza password basato su regole standard:
 * - lunghezza ≥8 (debole), ≥12 (media), ≥16 (forte)
 * - presenza maiuscole/minuscole, numeri, simboli
 * Punteggio 0-4. Visualizzato come barra colorata + label.
 */
export function computePasswordScore(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
} {
  if (password.length === 0) {
    return { score: 0, label: '', color: 'bg-gray-200' }
  }
  if (password.length < 8) {
    return { score: 1, label: 'Troppo corta', color: 'bg-red-500' }
  }

  let strength = 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++
  if (password.length >= 12) strength++

  const score = Math.min(4, strength) as 0 | 1 | 2 | 3 | 4
  const labels = ['', 'Debole', 'Media', 'Buona', 'Forte']
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  return { score, label: labels[score]!, color: colors[score]! }
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { score, label, color } = computePasswordScore(password)
  if (password.length === 0) return null

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-xs font-medium ${
          score <= 1 ? 'text-red-600' :
          score === 2 ? 'text-orange-600' :
          score === 3 ? 'text-yellow-700' :
          'text-green-600'
        }`}>
          {label}
        </p>
      )}
    </div>
  )
}
