import { notFound } from 'next/navigation'
import { loadRestaurantBySlug } from '@/app/api/public/restaurant/_shared'
import { BookTableClient } from '../../book-table/[slug]/book-table-client'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ template?: string }>
}

export default async function EmbedTablePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { template } = await searchParams

  const ctx = await loadRestaurantBySlug(slug)
  if (!ctx) notFound()

  const tpl = (template ?? ctx.template ?? 'minimal') as 'minimal' | 'luxury' | 'mobile'

  return <BookTableClient context={ctx} template={tpl} isEmbed={true} />
}

export const metadata = {
  robots: 'noindex',
}
