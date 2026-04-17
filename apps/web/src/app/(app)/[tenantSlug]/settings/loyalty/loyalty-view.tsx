'use client'

import { useState, useTransition } from 'react'
import { Plus, Award, TrendingUp, Star } from 'lucide-react'
import { createLoyaltyProgram, createLoyaltyTier, adjustGuestPoints } from './actions'

interface Tier { id: string; name: string; minPoints: number; benefits: string[]; colorHex: string | null }
interface Program { id: string; name: string; description: string | null; pointsPerEur: number; active: boolean; tiers: Tier[] }
interface Guest { id: string; pointsBalance: number; pointsEarnedTotal: number; lastActivityAt: string | null }

interface Props {
  tenantSlug: string
  programs: Program[]
  topGuests: Guest[]
}

export function LoyaltyView({ tenantSlug, programs, topGuests }: Props) {
  const [showProgram, setShowProgram] = useState(false)
  const [showTier, setShowTier] = useState<string | null>(null)
  const [showAdjust, setShowAdjust] = useState<string | null>(null)

  return (
    <>
      {programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <Award className="mx-auto h-10 w-10 text-amber-500"/>
          <p className="mt-3 text-sm text-gray-600">Nessun programma fedeltà</p>
          <button onClick={() => setShowProgram(true)}
            className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
            Crea programma
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-gray-500">Programmi</h2>
            <button onClick={() => setShowProgram(true)}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
              <Plus className="h-3 w-3"/> Nuovo
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {programs.map((p) => (
              <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.description ?? ''}</p>
                    <p className="mt-1 text-xs text-amber-700">{p.pointsPerEur} punti / € spesi</p>
                  </div>
                  <button onClick={() => setShowTier(p.id)}
                    className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    + Tier
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  {p.tiers.length === 0 ? (
                    <p className="text-xs text-gray-400">Nessun tier definito</p>
                  ) : p.tiers.sort((a, b) => a.minPoints - b.minPoints).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded bg-gray-50 p-2 text-xs">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.colorHex ?? '#9ca3af' }}/>
                      <span className="font-medium">{t.name}</span>
                      <span className="text-gray-500">≥ {t.minPoints} pt</span>
                      <span className="ml-auto text-gray-400">{t.benefits.length} benefits</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {topGuests.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4 text-amber-500"/> Top ospiti per punti
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Guest</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-right">Totale guadagnati</th>
                <th className="px-4 py-2 text-left">Ultima attività</th>
                <th className="px-4 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {topGuests.map((g) => (
                <tr key={g.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-xs text-gray-600">{g.id.slice(0, 8)}…</td>
                  <td className="px-4 py-2 text-right font-bold text-amber-600">{g.pointsBalance}</td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">{g.pointsEarnedTotal}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {g.lastActivityAt ? new Date(g.lastActivityAt).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setShowAdjust(g.id)}
                      className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:border-blue-400">
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showProgram && <ProgramDialog tenantSlug={tenantSlug} onClose={() => setShowProgram(false)}/>}
      {showTier && <TierDialog programId={showTier} tenantSlug={tenantSlug} onClose={() => setShowTier(null)}/>}
      {showAdjust && <AdjustDialog guestLoyaltyId={showAdjust} tenantSlug={tenantSlug} onClose={() => setShowAdjust(null)}/>}
    </>
  )
}

function ProgramDialog({ tenantSlug, onClose }: { tenantSlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', description: '', pointsPerEur: 1 })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await createLoyaltyProgram({ tenantSlug, ...form, description: form.description || undefined })
          onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo programma</h2>
        <input required placeholder="Nome programma" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="Descrizione" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <div>
          <label className="text-xs text-gray-600">Punti per € spesi</label>
          <input type="number" step="0.1" value={form.pointsPerEur}
            onChange={(e) => setForm({ ...form, pointsPerEur: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Crea'}</button>
        </div>
      </form>
    </div>
  )
}

function TierDialog({ programId, tenantSlug, onClose }: { programId: string; tenantSlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', minPoints: 0, benefits: '', colorHex: '#3b82f6' })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await createLoyaltyTier({
            programId, tenantSlug, name: form.name, minPoints: form.minPoints,
            benefits: form.benefits.split(',').map((s) => s.trim()).filter(Boolean),
            colorHex: form.colorHex,
            orderIdx: 0,
          })
          onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Nuovo tier</h2>
        <input required placeholder="Nome (Bronze, Silver, Gold)" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input required type="number" min={0} placeholder="Min punti" value={form.minPoints}
          onChange={(e) => setForm({ ...form, minPoints: Number(e.target.value) })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="Benefits (separati da virgola)" value={form.benefits}
          onChange={(e) => setForm({ ...form, benefits: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input type="color" value={form.colorHex} onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
          className="h-8 w-full"/>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Crea'}</button>
        </div>
      </form>
    </div>
  )
}

function AdjustDialog({ guestLoyaltyId, tenantSlug, onClose }: { guestLoyaltyId: string; tenantSlug: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ points: 0, transactionType: 'adjust' as 'earn'|'redeem'|'adjust', notes: '' })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          await adjustGuestPoints({ guestLoyaltyId, tenantSlug, ...form, notes: form.notes || undefined })
          onClose()
        })
      }} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Adjust punti</h2>
        <select value={form.transactionType}
          onChange={(e) => setForm({ ...form, transactionType: e.target.value as 'earn' })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="earn">Earn (aggiungi)</option>
          <option value="redeem">Redeem (riscatta)</option>
          <option value="adjust">Adjust manuale</option>
        </select>
        <input required type="number" placeholder="Punti (negativo per sottrarre)" value={form.points}
          onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <input placeholder="Note" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"/>
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Annulla</button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{pending ? 'Salvo…' : 'Applica'}</button>
        </div>
      </form>
    </div>
  )
}
