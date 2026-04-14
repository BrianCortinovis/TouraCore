'use client'

import { useState, useEffect } from 'react'
import {
  X,
  User,
  Calendar,
  CreditCard,
  FileText,
  Zap,
  Mail,
  Phone,
  Euro,
  Clock,
} from 'lucide-react'
import type { PlanningBooking, PlanningRoom } from './actions'
import { STATUS_STYLES, SOURCE_LABELS } from './planning-types'

interface ReservationDrawerProps {
  booking: PlanningBooking
  rooms: PlanningRoom[]
  onClose: () => void
}

type TabId = 'guest' | 'stay' | 'payment' | 'notes' | 'actions'

export function ReservationDrawer({ booking, rooms, onClose }: ReservationDrawerProps) {
  const [tab, setTab] = useState<TabId>('guest')

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const style = STATUS_STYLES[booking.status]
  const room: PlanningRoom | null = booking.room_id
    ? (rooms.find((r) => r.id === booking.room_id) ?? null)
    : null

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.check_out).getTime() -
        new Date(booking.check_in).getTime()) /
        86400000
    )
  )

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'guest', label: 'Ospite', icon: User },
    { id: 'stay', label: 'Soggiorno', icon: Calendar },
    { id: 'payment', label: 'Pagamento', icon: CreditCard },
    { id: 'notes', label: 'Note', icon: FileText },
    { id: 'actions', label: 'Azioni', icon: Zap },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 h-screen w-[480px] max-w-[90vw] border-l border-gray-200 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div
              className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: style.bg,
                color: style.text,
                borderLeft: `3px solid ${style.border}`,
              }}
            >
              {style.label}
            </div>
            <h2 className="truncate text-xl font-bold text-gray-900">
              {booking.guest_name}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {room ? `Camera ${room.room_number}` : 'Camera non assegnata'} · {nights}{' '}
              {nights === 1 ? 'notte' : 'notti'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab === 'guest' && <GuestTab booking={booking} />}
          {tab === 'stay' && <StayTab booking={booking} room={room} nights={nights} />}
          {tab === 'payment' && <PaymentTab booking={booking} />}
          {tab === 'notes' && <NotesTab booking={booking} />}
          {tab === 'actions' && <ActionsTab booking={booking} />}
        </div>
      </aside>
    </>
  )
}

function GuestTab({ booking }: { booking: PlanningBooking }) {
  return (
    <dl className="space-y-4">
      <Field label="Nome completo">{booking.guest_name}</Field>
      <Field
        label="Email"
        icon={<Mail className="h-3.5 w-3.5 text-gray-400" />}
      >
        {booking.guest_email || '—'}
      </Field>
      {booking.guest_phone && (
        <Field
          label="Telefono"
          icon={<Phone className="h-3.5 w-3.5 text-gray-400" />}
        >
          {booking.guest_phone}
        </Field>
      )}
      <Field label="Numero ospiti">
        {booking.adults + booking.children > 0 ? `${booking.adults} adulti${booking.children > 0 ? `, ${booking.children} bambini` : ''}` : '—'}
      </Field>
    </dl>
  )
}

function StayTab({
  booking,
  room,
  nights,
}: {
  booking: PlanningBooking
  room: PlanningRoom | null
  nights: number
}) {
  return (
    <dl className="space-y-4">
      <Field label="Camera assegnata">
        {room ? `${room.room_number}${room.floor !== null ? ` · Piano ${room.floor}` : ''}` : '—'}
      </Field>
      {room && <Field label="Tipologia">{room.room_type_name}</Field>}
      <Field label="Check-in">
        {new Date(booking.check_in).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Field>
      <Field label="Check-out">
        {new Date(booking.check_out).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Field>
      <Field
        label="Durata"
        icon={<Clock className="h-3.5 w-3.5 text-gray-400" />}
      >
        {nights} {nights === 1 ? 'notte' : 'notti'}
      </Field>
      <Field label="Canale">{SOURCE_LABELS[booking.source]}</Field>
    </dl>
  )
}

function PaymentTab({ booking }: { booking: PlanningBooking }) {
  return (
    <dl className="space-y-4">
      <Field
        label="Importo totale"
        icon={<Euro className="h-3.5 w-3.5 text-gray-400" />}
      >
        <span className="text-xl font-semibold text-gray-900">
          {booking.currency} {booking.total_amount.toFixed(2)}
        </span>
      </Field>
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
        <p className="text-xs text-gray-500">
          Dettaglio pagamenti (carte, bonifici, ricevute) disponibile a breve.
        </p>
      </div>
    </dl>
  )
}

function NotesTab({ booking }: { booking: PlanningBooking }) {
  return (
    <div>
      {booking.notes ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
          {booking.notes}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Nessuna nota per questa prenotazione.</p>
      )}
    </div>
  )
}

function ActionsTab({ booking }: { booking: PlanningBooking }) {
  return (
    <div className="space-y-2">
      <ActionButton label="Conferma" enabled={booking.status === 'inquiry' || booking.status === 'option'} />
      <ActionButton label="Check-in" enabled={booking.status === 'confirmed'} />
      <ActionButton label="Check-out" enabled={booking.status === 'checked_in'} />
      <ActionButton
        label="Cancella prenotazione"
        enabled={booking.status !== 'cancelled' && booking.status !== 'checked_out' && booking.status !== 'no_show'}
        destructive
      />
      <p className="mt-4 text-xs text-gray-500">
        Le azioni sulla prenotazione saranno attive a breve. Questo drawer è la vista di lettura.
      </p>
    </div>
  )
}

function ActionButton({
  label,
  enabled,
  destructive,
}: {
  label: string
  enabled: boolean
  destructive?: boolean
}) {
  return (
    <button
      disabled={!enabled}
      className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}
