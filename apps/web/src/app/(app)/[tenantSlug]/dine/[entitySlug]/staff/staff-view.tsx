'use client'

import { useState, useTransition } from 'react'
import { Plus, Clock, Coins, LogIn, LogOut } from 'lucide-react'
import { createStaff, createShift, clockInOut, createTipPool } from './actions'

const ROLES: Array<{ code: string; label: string }> = [
  { code: 'chef', label: 'Chef' },
  { code: 'sous_chef', label: 'Sous chef' },
  { code: 'line_cook', label: 'Cuoco linea' },
  { code: 'pastry_chef', label: 'Pasticcere' },
  { code: 'dishwasher', label: 'Lavapiatti' },
  { code: 'maitre', label: 'Maitre' },
  { code: 'waiter', label: 'Cameriere' },
  { code: 'runner', label: 'Runner' },
  { code: 'sommelier', label: 'Sommelier' },
  { code: 'barman', label: 'Barman' },
  { code: 'host', label: 'Host' },
]

interface Staff {
  id: string
  fullName: string
  role: string
  pinCode: string | null
  hourlyRate: number | null
}

interface Shift {
  id: string
  staffId: string
  startAt: string
  endAt: string
  role: string
  status: string
}

interface Pool {
  id: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  status: string
  ruleType: string
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  staff: Staff[]
  shifts: Shift[]
  pools: Pool[]
  weekStart: string
}

export function StaffView(props: Props) {
  const { tenantSlug, entitySlug, restaurantId, staff, shifts, pools, weekStart } = props
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddShift, setShowAddShift] = useState(false)
  const [showAddPool, setShowAddPool] = useState(false)
  const [showClock, setShowClock] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <button
          onClick={() => setShowClock(true)}
          className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          <Clock className="h-3 w-3" /> Clock IN/OUT (PIN)
        </button>
        <button
          onClick={() => setShowAddStaff(true)}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" /> Staff
        </button>
        <button
          onClick={() => setShowAddShift(true)}
          disabled={staff.length === 0}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Turno
        </button>
        <button
          onClick={() => setShowAddPool(true)}
          className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          <Coins className="h-3 w-3" /> Tip pool
        </button>
      </div>

      {/* Shifts week grid */}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Turni settimana</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-max text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Staff</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="border-l border-gray-100 px-3 py-2 text-center font-medium text-gray-500">
                    {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">
                    {s.fullName}
                    <span className="ml-1 text-[10px] text-gray-400">({ROLES.find((r) => r.code === s.role)?.label})</span>
                  </td>
                  {days.map((d) => {
                    const dayShifts = shifts.filter(
                      (sh) =>
                        sh.staffId === s.id &&
                        new Date(sh.startAt).toDateString() === d.toDateString(),
                    )
                    return (
                      <td key={d.toISOString()} className="border-l border-gray-100 px-2 py-1 align-top">
                        {dayShifts.map((sh) => (
                          <div
                            key={sh.id}
                            className="mb-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
                          >
                            {new Date(sh.startAt).toTimeString().slice(0, 5)}-
                            {new Date(sh.endAt).toTimeString().slice(0, 5)}
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tip pools */}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <h2 className="text-sm font-semibold">Tip pool storico</h2>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Periodo</th>
              <th className="px-3 py-1.5 text-left">Regola</th>
              <th className="px-3 py-1.5 text-right">Totale</th>
              <th className="px-3 py-1.5 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {pools.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                  Nessun tip pool
                </td>
              </tr>
            ) : (
              pools.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">
                    {p.periodStart} → {p.periodEnd}
                  </td>
                  <td className="px-3 py-1.5">{p.ruleType}</td>
                  <td className="px-3 py-1.5 text-right font-medium">€ {p.totalAmount.toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        p.status === 'distributed'
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-gray-300 bg-gray-50 text-gray-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showAddStaff && (
        <AddStaffDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowAddStaff(false)}
        />
      )}
      {showAddShift && (
        <AddShiftDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          staff={staff}
          weekStart={weekStart}
          onClose={() => setShowAddShift(false)}
        />
      )}
      {showAddPool && (
        <AddPoolDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          weekStart={weekStart}
          onClose={() => setShowAddPool(false)}
        />
      )}
      {showClock && (
        <ClockDialog
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setShowClock(false)}
        />
      )}
    </>
  )
}

function AddStaffDialog(props: { restaurantId: string; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ fullName: '', role: 'waiter', pinCode: '', hourlyRate: 0 })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(async () => {
            await createStaff({
              restaurantId: props.restaurantId,
              tenantSlug: props.tenantSlug,
              entitySlug: props.entitySlug,
              fullName: form.fullName,
              role: form.role as 'chef' | 'sous_chef' | 'line_cook' | 'pastry_chef' | 'dishwasher' | 'maitre' | 'waiter' | 'runner' | 'sommelier' | 'barman' | 'host',
              pinCode: form.pinCode || undefined,
              hourlyRate: form.hourlyRate || undefined,
            })
            props.onClose()
          })
        }}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Nuovo staff</h2>
        <input
          required
          placeholder="Nome completo"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          placeholder="PIN clock-in (4-6 cifre)"
          value={form.pinCode}
          onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          step="0.5"
          placeholder="Tariffa oraria € (opt)"
          value={form.hourlyRate || ''}
          onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Salvo…' : 'Crea'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AddShiftDialog(props: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  staff: Staff[]
  weekStart: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    staffId: props.staff[0]?.id ?? '',
    date: props.weekStart,
    startTime: '11:30',
    endTime: '15:00',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const startAt = new Date(`${form.date}T${form.startTime}:00`).toISOString()
          const endAt = new Date(`${form.date}T${form.endTime}:00`).toISOString()
          const staffMember = props.staff.find((s) => s.id === form.staffId)
          startTransition(async () => {
            await createShift({
              restaurantId: props.restaurantId,
              tenantSlug: props.tenantSlug,
              entitySlug: props.entitySlug,
              staffId: form.staffId,
              startAt,
              endAt,
              role: staffMember?.role ?? 'waiter',
            })
            props.onClose()
          })
        }}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Nuovo turno</h2>
        <select
          required
          value={form.staffId}
          onChange={(e) => setForm({ ...form, staffId: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {props.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} — {ROLES.find((r) => r.code === s.role)?.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            required
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Salvo…' : 'Crea turno'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AddPoolDialog(props: {
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  weekStart: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const weekEnd = new Date(props.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const [form, setForm] = useState({
    periodStart: props.weekStart,
    periodEnd: weekEnd.toISOString().slice(0, 10),
    totalAmount: 0,
    ruleType: 'egalitarian' as 'egalitarian' | 'weighted_role' | 'seniority',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(async () => {
            await createTipPool({
              restaurantId: props.restaurantId,
              tenantSlug: props.tenantSlug,
              entitySlug: props.entitySlug,
              periodStart: form.periodStart,
              periodEnd: form.periodEnd,
              totalAmount: form.totalAmount,
              ruleType: form.ruleType,
            })
            props.onClose()
          })
        }}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Nuovo tip pool</h2>
        <p className="text-xs text-gray-500">Distribuisce mance proporzionalmente alle ore lavorate.</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <input
            type="date"
            required
            value={form.periodStart}
            onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            type="date"
            required
            value={form.periodEnd}
            onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <input
            type="number"
            step="0.5"
            required
            placeholder="Totale mance €"
            value={form.totalAmount || ''}
            onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
            className="col-span-2 rounded border border-gray-300 px-2 py-1.5"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={props.onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Calcolo…' : 'Crea + distribuisci'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ClockDialog(props: { restaurantId: string; tenantSlug: string; entitySlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handle(action: 'in' | 'out') {
    setMsg(null)
    setError(null)
    startTransition(async () => {
      try {
        const res = await clockInOut({
          restaurantId: props.restaurantId,
          tenantSlug: props.tenantSlug,
          entitySlug: props.entitySlug,
          pinCode: pin,
          action,
        })
        setMsg(`✓ ${res.staffName} — Clock ${res.action.toUpperCase()} ${new Date().toLocaleTimeString('it-IT')}`)
        setPin('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Clock IN/OUT</h2>
        <input
          type="password"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={10}
          className="w-full rounded border border-gray-300 px-3 py-3 text-center text-2xl tracking-widest"
        />
        {msg && <p className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</p>}
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handle('in')}
            disabled={pending || pin.length < 4}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> IN
          </button>
          <button
            onClick={() => handle('out')}
            disabled={pending || pin.length < 4}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" /> OUT
          </button>
        </div>
        <button onClick={props.onClose} className="text-xs text-gray-500">
          Chiudi
        </button>
      </div>
    </div>
  )
}
