import { notFound } from 'next/navigation'
import { loadRestaurantBySlug } from '@/app/api/public/restaurant/_shared'
import { BookTableClient } from './book-table-client'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ template?: string; embed?: string; preview_step?: string }>
}

const VALID_STEPS = ['slot', 'guest', 'deposit', 'success'] as const

export default async function BookTablePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { template, embed, preview_step } = await searchParams

  const ctx = await loadRestaurantBySlug(slug)
  if (!ctx) notFound()

  const tpl = (template ?? ctx.template ?? 'minimal') as 'minimal' | 'luxury' | 'mobile'
  const previewStep = preview_step && (VALID_STEPS as readonly string[]).includes(preview_step)
    ? (preview_step as 'slot' | 'guest' | 'deposit' | 'success')
    : undefined

  return (
    <BookTableClient context={ctx} template={tpl} isEmbed={embed === '1'} previewStep={previewStep} />
  )
}
