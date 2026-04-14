'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PropertyForm } from '../components/property-form'
import { getPropertyAction } from '../actions'

export default function EditPropertyPage() {
  const params = useParams()
  const entityId = params.id as string
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPropertyAction(entityId)
      if (result.success && result.data) {
        setData(result.data as Record<string, unknown>)
      }
    } catch {
      // Errore gestito dal error boundary
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-gray-500">
        Struttura non trovata o non hai accesso.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Modifica: {data.name as string}
      </h1>
      <PropertyForm entityId={entityId} initialData={data} />
    </div>
  )
}
