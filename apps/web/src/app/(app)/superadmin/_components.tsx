import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { type LucideIcon } from 'lucide-react'
import type { MonthBucket, SuperadminTone } from './_lib'

const toneClasses: Record<SuperadminTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200',
  rose: 'bg-rose-100 text-rose-700 ring-rose-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  violet: 'bg-violet-100 text-violet-700 ring-violet-200',
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base text-slate-900">{title}</CardTitle>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: SuperadminTone
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
          </div>
          <div className={`rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TrendList({
  items,
  valueLabel = 'valore',
  barTone = 'bg-slate-900',
}: {
  items: MonthBucket[]
  valueLabel?: string
  barTone?: string
}) {
  const max = Math.max(1, ...items.map((item) => item.value))

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = (item.value / max) * 100
        return (
          <div key={item.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-500">
              {item.label}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${barTone}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-700">
              {item.value}
            </span>
          </div>
        )
      })}
      <p className="text-xs text-slate-400">Serie mensile in {valueLabel}</p>
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: SuperadminTone
}) {
  return (
    <Badge className={`border ${toneClasses[tone]} bg-transparent`}>
      {children}
    </Badge>
  )
}

export function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: LucideIcon
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

