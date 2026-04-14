'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@touracore/auth/store'
import { switchProperty } from './profile/actions'

export function PropertySelector() {
  const { property, properties } = useAuthStore()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (properties.length <= 1) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const entityId = e.target.value
    startTransition(async () => {
      const result = await switchProperty(entityId)
      if (result.success) {
        router.refresh()
      }
    })
  }

  return (
    <select
      value={property?.id ?? ''}
      onChange={handleChange}
      disabled={isPending}
      className="h-8 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {properties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
