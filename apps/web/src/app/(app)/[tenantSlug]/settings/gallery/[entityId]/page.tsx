import { notFound } from 'next/navigation'
import { loadGalleryStateAction } from './actions'
import { GalleryEditor } from './gallery-editor'

interface Props {
  params: Promise<{ tenantSlug: string; entityId: string }>
}

export default async function GalleryPage({ params }: Props) {
  const { entityId } = await params
  const result = await loadGalleryStateAction(entityId)
  if (!result.success || !result.data) notFound()

  return <GalleryEditor initial={result.data} />
}
