import { ALL_PROPERTY_TYPES } from '@touracore/hospitality/src/config'
import { MEAL_PLAN_LABELS } from '@touracore/hospitality/src/constants'
import type { PropertyType } from '@touracore/hospitality/src/types/database'

export default function WiringProofPage() {
  const types: PropertyType[] = ALL_PROPERTY_TYPES
  const mealPlans = Object.entries(MEAL_PLAN_LABELS)

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Wiring Proof: @touracore/hospitality</h1>
      <section>
        <h2>Property Types ({types.length})</h2>
        <ul>
          {types.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Meal Plans</h2>
        <ul>
          {mealPlans.map(([key, label]) => (
            <li key={key}>
              {key}: {label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
