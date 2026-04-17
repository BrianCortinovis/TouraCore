import { createServiceRoleClient } from '@touracore/db/server'
import { WidgetEmbed } from './widget-embed'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WidgetPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServiceRoleClient()

  const { data: property } = await supabase
    .from('entities')
    .select('id, name, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!property) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Struttura non trovata.</p>
      </div>
    )
  }

  return (
    <WidgetEmbed
      propertySlug={property.slug || slug}
      propertyName={property.name}
      accentColor={'blue'}
    />
  )
}
