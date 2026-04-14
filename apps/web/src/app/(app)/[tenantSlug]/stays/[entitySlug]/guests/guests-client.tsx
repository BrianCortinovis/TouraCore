'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Input, Badge, DataTable, Modal, cn } from '@touracore/ui'
import {
  Search, Plus, Mail, Phone, MapPin, Users,
  Eye, Trash2, Edit, Save, X, Building2, FileText,
  Download, Filter, Calendar, CreditCard, History,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  loadGuestsAction, loadGuestAction,
  createGuestAction, updateGuestAction, deleteGuestAction,
  loadGuestStayHistoryAction, loadGuestCountriesAction, loadGuestTagsAction,
} from './actions'
import type { UpdateGuestData } from '@touracore/hospitality/src/actions/guests'
import type { Guest } from '@touracore/hospitality/src/types/database'
import type { GuestStayRecord } from '@touracore/hospitality/src/queries/guests'

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-purple-100 text-purple-800',
  business: 'bg-blue-100 text-blue-800',
  family: 'bg-green-100 text-green-800',
  repeater: 'bg-yellow-100 text-yellow-800',
}

const LOYALTY_COLORS: Record<string, string> = {
  platinum: 'bg-gray-800 text-white',
  gold: 'bg-yellow-500 text-white',
  silver: 'bg-gray-400 text-white',
  bronze: 'bg-orange-600 text-white',
}

const LOYALTY_LABELS: Record<string, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
}

const DOCUMENT_LABELS: Record<string, string> = {
  id_card: 'Carta d\'identità',
  passport: 'Passaporto',
  driving_license: 'Patente',
  residence_permit: 'Permesso di soggiorno',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  canceled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  no_show: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  confirmed: 'Confermata',
  canceled: 'Annullata',
  completed: 'Completata',
  no_show: 'No show',
}

function GuestAvatar({ guest }: { guest: Guest }) {
  const initials = `${guest.first_name[0] ?? ''}${guest.last_name[0] ?? ''}`.toUpperCase()
  const cls = guest.loyalty_level ? LOYALTY_COLORS[guest.loyalty_level] ?? 'bg-gray-200 text-gray-700' : 'bg-gray-200 text-gray-700'
  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', cls)}>
      {initials}
    </div>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), 'dd MMM yyyy', { locale: it }) } catch { return d }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v)
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000))
}

type Tab = 'info' | 'stays' | 'notes'

export function GuestsClient({ entityId }: { entityId: string }) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateGuestData>({})
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [stayHistory, setStayHistory] = useState<GuestStayRecord[]>([])
  const [stayHistoryLoading, setStayHistoryLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterCountry, setFilterCountry] = useState('')
  const [filterLoyalty, setFilterLoyalty] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const pageSize = 25

  useEffect(() => {
    loadGuestCountriesAction().then(setAvailableCountries).catch(() => {})
    loadGuestTagsAction().then(setAvailableTags).catch(() => {})
  }, [])

  const loadGuests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await loadGuestsAction({
        search: search || undefined,
        country: filterCountry || undefined,
        loyaltyLevel: filterLoyalty || undefined,
        tags: filterTag ? [filterTag] : undefined,
        page,
        limit: pageSize,
      })
      setGuests(result.guests)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento ospiti')
    } finally {
      setIsLoading(false)
    }
  }, [search, page, filterCountry, filterLoyalty, filterTag])

  useEffect(() => { loadGuests() }, [loadGuests])

  const openDetail = useCallback(async (guest: Guest) => {
    setError(null)
    setStayHistory([])
    try {
      const full = await loadGuestAction(guest.id)
      setSelectedGuest(full)
    } catch {
      setSelectedGuest(guest)
    }
    setIsDetailOpen(true)
    setIsEditing(false)
    setActiveTab('info')
  }, [])

  const loadStayHistoryForGuest = useCallback(async (guestId: string) => {
    setStayHistoryLoading(true)
    try {
      const history = await loadGuestStayHistoryAction(guestId)
      setStayHistory(history)
    } catch {
      setStayHistory([])
    } finally {
      setStayHistoryLoading(false)
    }
  }, [])

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'stays' && selectedGuest && stayHistory.length === 0) {
      loadStayHistoryForGuest(selectedGuest.id)
    }
  }, [selectedGuest, stayHistory.length, loadStayHistoryForGuest])

  const startEdit = useCallback(() => {
    if (!selectedGuest) return
    setEditData({
      first_name: selectedGuest.first_name,
      last_name: selectedGuest.last_name,
      email: selectedGuest.email,
      phone: selectedGuest.phone,
      mobile: selectedGuest.mobile,
      date_of_birth: selectedGuest.date_of_birth,
      gender: selectedGuest.gender as UpdateGuestData['gender'],
      document_type: selectedGuest.document_type as UpdateGuestData['document_type'],
      document_number: selectedGuest.document_number,
      document_issued_by: selectedGuest.document_issued_by,
      document_country: selectedGuest.document_country,
      address: selectedGuest.address,
      city: selectedGuest.city,
      province: selectedGuest.province,
      zip: selectedGuest.zip,
      country: selectedGuest.country,
      nationality: selectedGuest.nationality,
      citizenship: selectedGuest.citizenship,
      fiscal_code: selectedGuest.fiscal_code,
      birth_place: selectedGuest.birth_place,
      birth_province: selectedGuest.birth_province,
      birth_country: selectedGuest.birth_country,
      company_name: selectedGuest.company_name,
      company_vat: selectedGuest.company_vat,
      company_sdi: selectedGuest.company_sdi,
      company_pec: selectedGuest.company_pec,
      internal_notes: selectedGuest.internal_notes,
      tags: selectedGuest.tags,
    })
    setIsEditing(true)
  }, [selectedGuest])

  const saveEdit = useCallback(async () => {
    if (!selectedGuest) return
    setSaving(true)
    setError(null)
    const result = await updateGuestAction(selectedGuest.id, editData)
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Errore salvataggio')
      return
    }
    setIsEditing(false)
    setIsDetailOpen(false)
    loadGuests()
  }, [selectedGuest, editData, loadGuests])

  const handleDelete = useCallback(async () => {
    if (!selectedGuest) return
    if (!confirm(`Eliminare ${selectedGuest.first_name} ${selectedGuest.last_name}?`)) return
    const result = await deleteGuestAction(selectedGuest.id)
    if (!result.success) {
      setError(result.error ?? 'Errore eliminazione')
      return
    }
    setIsDetailOpen(false)
    setSelectedGuest(null)
    loadGuests()
  }, [selectedGuest, loadGuests])

  const handleCreate = useCallback(async (first_name: string, last_name: string, email: string, phone: string, country: string) => {
    setSaving(true)
    setError(null)
    const result = await createGuestAction({
      entity_id: entityId,
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      country: country || null,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Errore creazione')
      return
    }
    setIsCreateOpen(false)
    loadGuests()
  }, [entityId, loadGuests])

  const exportCsv = useCallback(() => {
    if (guests.length === 0) return
    const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Paese', 'Tag', 'Soggiorni', 'Notti', 'Fatturato', 'Ultimo soggiorno']
    const rows = guests.map((g) => [
      g.first_name,
      g.last_name,
      g.email ?? '',
      g.phone ?? '',
      g.country ?? '',
      (g.tags ?? []).join('; '),
      String(g.total_stays),
      String(g.total_nights),
      String(g.total_revenue),
      g.last_stay_date ?? '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ospiti_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [guests])

  const activeFilterCount = [filterCountry, filterLoyalty, filterTag].filter(Boolean).length
  const clearFilters = () => { setFilterCountry(''); setFilterLoyalty(''); setFilterTag(''); setPage(1) }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (g: Guest) => (
        <div className="flex items-center gap-3">
          <GuestAvatar guest={g} />
          <div>
            <div className="font-medium">{g.first_name} {g.last_name}</div>
            {g.email && <div className="text-xs text-gray-500">{g.email}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Nazionalità',
      hideOnMobile: true,
      render: (g: Guest) => (
        <div className="text-sm">
          {g.city && <span>{g.city}</span>}
          {g.city && g.country && <span>, </span>}
          {g.country && <span className="text-gray-500">{g.country}</span>}
          {!g.city && !g.country && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Tag',
      hideOnMobile: true,
      render: (g: Guest) => (
        <div className="flex flex-wrap gap-1">
          {(g.tags ?? []).map((tag) => (
            <span
              key={tag}
              className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-700')}
            >
              {tag}
            </span>
          ))}
          {g.loyalty_level && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', LOYALTY_COLORS[g.loyalty_level] ?? 'bg-gray-100 text-gray-700')}>
              {LOYALTY_LABELS[g.loyalty_level] ?? g.loyalty_level}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'stays',
      header: 'Soggiorni',
      hideOnMobile: true,
      className: 'text-center',
      render: (g: Guest) => (
        <div className="text-center text-sm">
          <span className="font-medium">{g.total_stays}</span>
          <span className="ml-1 text-gray-400">({g.total_nights}n)</span>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Fatturato',
      hideOnMobile: true,
      className: 'text-right',
      render: (g: Guest) => (
        <div className="text-right text-sm font-medium">{fmtCurrency(g.total_revenue)}</div>
      ),
    },
    {
      key: 'last_stay',
      header: 'Ultimo soggiorno',
      hideOnMobile: true,
      render: (g: Guest) => (
        <div className="text-sm text-gray-500">{fmtDate(g.last_stay_date)}</div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (g: Guest) => (
        <button
          onClick={(e) => { e.stopPropagation(); openDetail(g) }}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ospiti</h1>
          <p className="mt-1 text-sm text-gray-500">{total} ospiti registrati</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={guests.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Esporta CSV
          </Button>
          <Button onClick={() => { setError(null); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Nuovo ospite
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, email, telefono, codice fiscale..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(activeFilterCount > 0 && 'border-blue-300 bg-blue-50 text-blue-700')}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Filtri{activeFilterCount > 0 && ` (${activeFilterCount})`}
          <ChevronDown className={cn('ml-1.5 h-3.5 w-3.5 transition-transform', showFilters && 'rotate-180')} />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Paese</label>
            <select
              value={filterCountry}
              onChange={(e) => { setFilterCountry(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              {availableCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Livello fedeltà</label>
            <select
              value={filterLoyalty}
              onChange={(e) => { setFilterLoyalty(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Tag</label>
            <select
              value={filterTag}
              onChange={(e) => { setFilterTag(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              {availableTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" /> Pulisci filtri
            </Button>
          )}
        </div>
      )}

      {error && !isDetailOpen && !isCreateOpen && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={guests}
        keyExtractor={(g) => g.id}
        onRowClick={openDetail}
        isLoading={isLoading}
        emptyMessage="Nessun ospite trovato"
        pagination={{ page, pageSize, total, onPageChange: setPage }}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setIsEditing(false); setError(null) }}
        size="lg"
        title={selectedGuest ? `${selectedGuest.first_name} ${selectedGuest.last_name}` : 'Ospite'}
      >
        {selectedGuest && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {selectedGuest.loyalty_level && (
                <Badge className={LOYALTY_COLORS[selectedGuest.loyalty_level]}>
                  {LOYALTY_LABELS[selectedGuest.loyalty_level] ?? selectedGuest.loyalty_level}
                </Badge>
              )}
              {(selectedGuest.tags ?? []).map((tag) => (
                <span key={tag} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-700')}>{tag}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{selectedGuest.total_stays}</div>
                <div className="text-xs text-gray-500">Soggiorni</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{selectedGuest.total_nights}</div>
                <div className="text-xs text-gray-500">Notti</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{fmtCurrency(selectedGuest.total_revenue)}</div>
                <div className="text-xs text-gray-500">Fatturato</div>
              </div>
            </div>

            <div className="flex gap-1 border-b border-gray-200">
              {([
                { key: 'info' as Tab, label: 'Informazioni' },
                { key: 'stays' as Tab, label: 'Soggiorni' },
                { key: 'notes' as Tab, label: 'Note' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'info' && !isEditing && <GuestInfoView guest={selectedGuest} />}
            {activeTab === 'info' && isEditing && <GuestEditForm data={editData} onChange={setEditData} />}

            {activeTab === 'stays' && (
              <StayHistoryTab
                stays={stayHistory}
                isLoading={stayHistoryLoading}
                guestName={`${selectedGuest.first_name} ${selectedGuest.last_name}`}
              />
            )}

            {activeTab === 'notes' && !isEditing && (
              <div className="min-h-[100px] whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {selectedGuest.internal_notes || 'Nessuna nota'}
              </div>
            )}
            {activeTab === 'notes' && isEditing && (
              <textarea
                value={editData.internal_notes ?? ''}
                onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })}
                rows={6}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note interne sull'ospite..."
              />
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Edit className="mr-1.5 h-3.5 w-3.5" /> Modifica
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Elimina
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? 'Salvataggio...' : 'Salva'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setError(null) }}>
                      <X className="mr-1.5 h-3.5 w-3.5" /> Annulla
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {selectedGuest.email && (
                  <a href={`mailto:${selectedGuest.email}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
                {selectedGuest.phone && (
                  <a href={`tel:${selectedGuest.phone}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                    <Phone className="h-3.5 w-3.5" /> Chiama
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <CreateGuestModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setError(null) }}
        onSubmit={handleCreate}
        saving={saving}
        error={error}
      />
    </div>
  )
}

function StayHistoryTab({
  stays,
  isLoading,
  guestName,
}: {
  stays: GuestStayRecord[]
  isLoading: boolean
  guestName: string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        Caricamento soggiorni...
      </div>
    )
  }

  if (stays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="mb-3 h-8 w-8 text-gray-300" />
        <div className="text-sm font-medium text-gray-500">Nessun soggiorno registrato</div>
        <div className="mt-1 text-xs text-gray-400">I soggiorni appariranno qui quando verranno collegate prenotazioni a questo ospite</div>
      </div>
    )
  }

  const totalRevenue = stays.reduce((sum, s) => sum + s.total_amount, 0)
  const totalNights = stays.reduce((sum, s) => sum + nightsBetween(s.check_in, s.check_out), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{stays.length}</div>
          <div className="text-xs text-gray-500">Prenotazioni</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{totalNights}</div>
          <div className="text-xs text-gray-500">Notti totali</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{fmtCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-500">Totale</div>
        </div>
      </div>

      <div className="space-y-2">
        {stays.map((stay) => (
          <div
            key={stay.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {fmtDate(stay.check_in)} — {fmtDate(stay.check_out)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{nightsBetween(stay.check_in, stay.check_out)} notti</span>
                  <span className="text-gray-300">|</span>
                  <span>{stay.source}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[stay.status] ?? 'bg-gray-100 text-gray-800')}>
                {STATUS_LABELS[stay.status] ?? stay.status}
              </span>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{fmtCurrency(stay.total_amount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GuestInfoView({ guest }: { guest: Guest }) {
  return (
    <div className="space-y-6">
      <InfoSection title="Contatti" icon={<Mail className="h-4 w-4" />}>
        <InfoGrid>
          <InfoItem label="Email" value={guest.email} />
          <InfoItem label="Telefono" value={guest.phone} />
          <InfoItem label="Cellulare" value={guest.mobile} />
        </InfoGrid>
      </InfoSection>

      <InfoSection title="Anagrafica" icon={<Users className="h-4 w-4" />}>
        <InfoGrid>
          <InfoItem label="Data di nascita" value={fmtDate(guest.date_of_birth)} />
          <InfoItem label="Luogo di nascita" value={[guest.birth_place, guest.birth_province].filter(Boolean).join(', ') || null} />
          <InfoItem label="Nazionalità" value={guest.nationality} />
          <InfoItem label="Cittadinanza" value={guest.citizenship} />
          <InfoItem label="Codice fiscale" value={guest.fiscal_code} />
        </InfoGrid>
      </InfoSection>

      <InfoSection title="Indirizzo" icon={<MapPin className="h-4 w-4" />}>
        <InfoGrid>
          <InfoItem label="Indirizzo" value={guest.address} />
          <InfoItem label="Città" value={guest.city} />
          <InfoItem label="Provincia" value={guest.province} />
          <InfoItem label="CAP" value={guest.zip} />
          <InfoItem label="Paese" value={guest.country} />
        </InfoGrid>
      </InfoSection>

      {guest.document_type && (
        <InfoSection title="Documento" icon={<FileText className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Tipo" value={DOCUMENT_LABELS[guest.document_type] ?? guest.document_type} />
            <InfoItem label="Numero" value={guest.document_number} />
            <InfoItem label="Rilasciato da" value={guest.document_issued_by} />
            <InfoItem label="Paese" value={guest.document_country} />
          </InfoGrid>
        </InfoSection>
      )}

      {guest.company_name && (
        <InfoSection title="Azienda" icon={<Building2 className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Ragione sociale" value={guest.company_name} />
            <InfoItem label="P.IVA" value={guest.company_vat} />
            <InfoItem label="SDI" value={guest.company_sdi} />
            <InfoItem label="PEC" value={guest.company_pec} />
          </InfoGrid>
        </InfoSection>
      )}

      {(guest.privacy_consent || guest.marketing_consent) && (
        <InfoSection title="Consensi GDPR" icon={<FileText className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem
              label="Privacy"
              value={guest.privacy_consent ? `Acconsentito il ${fmtDate(guest.privacy_consent_date)}` : 'Non dato'}
            />
            <InfoItem
              label="Marketing"
              value={guest.marketing_consent ? `Acconsentito il ${fmtDate(guest.marketing_consent_date)}` : 'Non dato'}
            />
          </InfoGrid>
        </InfoSection>
      )}

      <div className="text-xs text-gray-400">Creato il {fmtDate(guest.created_at)}</div>
    </div>
  )
}

function InfoSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">{icon} {title}</div>
      {children}
    </div>
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">{children}</div>
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value || '—'}</div>
    </div>
  )
}

function GuestEditForm({ data, onChange }: { data: UpdateGuestData; onChange: (d: UpdateGuestData) => void }) {
  const set = (field: keyof UpdateGuestData, value: string | null) => {
    onChange({ ...data, [field]: value || null })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome" value={(data.first_name as string) ?? ''} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Cognome" value={(data.last_name as string) ?? ''} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Input label="Email" type="email" value={(data.email as string) ?? ''} onChange={(e) => set('email', e.target.value)} />
        <Input label="Telefono" value={(data.phone as string) ?? ''} onChange={(e) => set('phone', e.target.value)} />
        <Input label="Cellulare" value={(data.mobile as string) ?? ''} onChange={(e) => set('mobile', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Input label="Data di nascita" type="date" value={(data.date_of_birth as string) ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} />
        <Input label="Nazionalità" value={(data.nationality as string) ?? ''} onChange={(e) => set('nationality', e.target.value)} />
        <Input label="Codice fiscale" value={(data.fiscal_code as string) ?? ''} onChange={(e) => set('fiscal_code', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Input label="Indirizzo" value={(data.address as string) ?? ''} onChange={(e) => set('address', e.target.value)} />
        <Input label="Città" value={(data.city as string) ?? ''} onChange={(e) => set('city', e.target.value)} />
        <Input label="Provincia" value={(data.province as string) ?? ''} onChange={(e) => set('province', e.target.value)} />
        <Input label="CAP" value={(data.zip as string) ?? ''} onChange={(e) => set('zip', e.target.value)} />
        <Input label="Paese" value={(data.country as string) ?? ''} onChange={(e) => set('country', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo documento</label>
          <select
            value={(data.document_type as string) ?? ''}
            onChange={(e) => onChange({ ...data, document_type: (e.target.value || null) as UpdateGuestData['document_type'] })}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">—</option>
            <option value="id_card">Carta d&apos;identità</option>
            <option value="passport">Passaporto</option>
            <option value="driving_license">Patente</option>
            <option value="residence_permit">Permesso di soggiorno</option>
          </select>
        </div>
        <Input label="Numero documento" value={(data.document_number as string) ?? ''} onChange={(e) => set('document_number', e.target.value)} />
        <Input label="Rilasciato da" value={(data.document_issued_by as string) ?? ''} onChange={(e) => set('document_issued_by', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Ragione sociale" value={(data.company_name as string) ?? ''} onChange={(e) => set('company_name', e.target.value)} />
        <Input label="P.IVA" value={(data.company_vat as string) ?? ''} onChange={(e) => set('company_vat', e.target.value)} />
        <Input label="SDI" value={(data.company_sdi as string) ?? ''} onChange={(e) => set('company_sdi', e.target.value)} />
        <Input label="PEC" value={(data.company_pec as string) ?? ''} onChange={(e) => set('company_pec', e.target.value)} />
      </div>
    </div>
  )
}

function CreateGuestModal({
  isOpen, onClose, onSubmit, saving, error,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (firstName: string, lastName: string, email: string, phone: string, country: string) => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', country: '' })

  const handleSubmit = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    onSubmit(form.first_name.trim(), form.last_name.trim(), form.email.trim(), form.phone.trim(), form.country.trim())
  }

  useEffect(() => {
    if (isOpen) setForm({ first_name: '', last_name: '', email: '', phone: '', country: '' })
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo ospite" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} autoFocus />
          <Input label="Cognome *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Paese" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.first_name.trim() || !form.last_name.trim()}>
            {saving ? 'Creazione...' : 'Crea ospite'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
