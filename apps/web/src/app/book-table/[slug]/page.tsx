import { notFound } from 'next/navigation'
import { loadRestaurantBySlug } from '@/app/api/public/restaurant/_shared'
import { BookTableClient } from './book-table-client'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ template?: string; embed?: string }>
}

export default async function BookTablePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { template, embed } = await searchParams

  const ctx = await loadRestaurantBySlug(slug)
  if (!ctx) notFound()

  const tpl = (template ?? ctx.template ?? 'minimal') as 'minimal' | 'luxury' | 'mobile'

  return (
    <BookTableClient context={ctx} template={tpl} isEmbed={embed === '1'} />
  )
}
