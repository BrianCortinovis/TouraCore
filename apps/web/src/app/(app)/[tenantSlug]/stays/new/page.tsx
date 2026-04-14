import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { NewStayForm } from './new-stay-form'

interface NewStayProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function NewStayPage({ params }: NewStayProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, country')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuova struttura</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea una nuova struttura ricettiva da gestire nel tuo account
        </p>
      </div>
      <NewStayForm tenantSlug={tenantSlug} defaultCountry={tenant.country ?? 'IT'} />
    </div>
  )
}
