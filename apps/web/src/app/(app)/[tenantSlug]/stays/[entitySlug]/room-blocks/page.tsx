'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button, Badge, Card, CardContent, Input } from '@touracore/ui'
import {
  Ban, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle,
  Calendar, X,
} from 'lucide-react'
import {
  loadBlocksAction,
  loadRoomsAction,
  createBlockAction,
  deleteBlockAction,
  bulkCreateBlocksAction,
  bulkDeleteBlocksAction,
} from './actions'
import { useAuthStore } from '@touracore/auth/store'
import { getStructureTerms } from '../../../../../structure-terms'

interface RoomBlock {
  id: string
  room_id: string
  block_type: string
  date_from: string
  date_to: string
  reason: string | null
  created_at: string
  room: {
    id: string
    name: string
    room_number: string
    room_type: { id: string; name: string }
  } | null
}

interface Room {
  id: string
  name: string
  room_number: string
  room_type: { id: string; name: string } | null
}

const BLOCK_TYPES = [
  { value: 'owner_use', label: 'Uso proprietario', color: 'bg-purple-100 text-purple-800' },
  { value: 'friends', label: 'Amici/Famiglia', color: 'bg-blue-100 text-blue-800' },
  { value: 'maintenance', label: 'Manutenzione', color: 'bg-amber-100 text-amber-800' },
  { value: 'renovation', label: 'Ristrutturazione', color: 'bg-red-100 text-red-800' },
  { value: 'seasonal_close', label: 'Chiusura stagionale', color: 'bg-gray-100 text-gray-800' },
  { value: 'other', label: 'Altro', color: 'bg-gray-100 text-gray-600' },
]

function getBlockLabel(type: string): string {
  return BLOCK_TYPES.find(b => b.value === type)?.label ?? type
}

function getBlockColor(type: string): string {
  return BLOCK_TYPES.find(b => b.value === type)?.color ?? 'bg-gray-100 text-gray-600'
}

function daysBetween(from: string, to: string): number {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000))
}

export default function RoomBlocksPage() {
  const { property } = useAuthStore()
  const terms = getStructureTerms(property?.property_type)
  const [blocks, setBlocks] = useState<RoomBlock[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)

  // Create form state
  const [formRoomIds, setFormRoomIds] = useState<string[]>([])
  const [formType, setFormType] = useState('maintenance')
  const [formFrom, setFormFrom] = useState(new Date().toISOString().split('T')[0]!)
  const [formTo, setFormTo] = useState(new Date().toISOString().split('T')[0]!)
  const [formReason, setFormReason] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [blocksResult, roomsResult] = await Promise.all([
        loadBlocksAction(),
        loadRoomsAction(),
      ])
      if (blocksResult.success && blocksResult.data) {
        setBlocks(blocksResult.data.blocks as RoomBlock[])
      }
      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data.rooms as Room[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const handleCreate = async () => {
    if (formRoomIds.length === 0 || !formFrom || !formTo) return
    setCreating(true)
    setError('')
    setSuccess('')

    if (formRoomIds.length === 1) {
      const result = await createBlockAction({
        room_id: formRoomIds[0]!,
        block_type: formType,
        date_from: formFrom,
        date_to: formTo,
        reason: formReason || undefined,
      })
      if (result.success) {
        setSuccess('Blocco creato')
        setShowCreate(false)
        resetForm()
        void loadData()
      } else {
        setError(result.error ?? 'Errore')
      }
    } else {
      const result = await bulkCreateBlocksAction({
        room_ids: formRoomIds,
        block_type: formType,
        date_from: formFrom,
        date_to: formTo,
        reason: formReason || undefined,
      })
      if (result.success && result.data) {
        const created = result.data.created as number
        const errors = result.data.errors as string[]
        setSuccess(`${created} blocchi creati${errors.length > 0 ? `, ${errors.length} errori` : ''}`)
        setShowCreate(false)
        resetForm()
        void loadData()
      } else {
        setError(result.error ?? 'Errore')
      }
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteBlockAction(id)
    if (result.success) {
      void loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setError('')
    setSuccess('')
    const result = await bulkDeleteBlocksAction(Array.from(selectedIds))
    if (result.success && result.data) {
      const deleted = result.data.deleted as number
      setSuccess(`${deleted} blocchi eliminati`)
      setSelectedIds(new Set())
      void loadData()
    } else {
      setError(result.error ?? 'Errore')
    }
  }

  const resetForm = () => {
    setFormRoomIds([])
    setFormType('maintenance')
    setFormFrom(new Date().toISOString().split('T')[0]!)
    setFormTo(new Date().toISOString().split('T')[0]!)
    setFormReason('')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRoomSelect = (roomId: string) => {
    setFormRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId],
    )
  }

  const activeBlocks = blocks.filter(b => b.date_to >= new Date().toISOString().split('T')[0]!)
  const pastBlocks = blocks.filter(b => b.date_to < new Date().toISOString().split('T')[0]!)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="h-6 w-6" />
            Blocchi {terms.unitLabelPluralTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestione chiusure, manutenzioni e blocchi disponibilità
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setShowCreate(true); setBulkMode(false) }}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo blocco
          </Button>
          <Button variant="outline" onClick={() => { setShowCreate(true); setBulkMode(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            Blocco multiplo
          </Button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {bulkMode ? 'Blocco multiplo camere' : 'Nuovo blocco'}
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Room selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {bulkMode ? 'Seleziona camere' : 'Camera'}
              </label>
              {bulkMode ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => toggleRoomSelect(room.id)}
                      className={`rounded-lg border p-2 text-center text-sm transition-colors ${
                        formRoomIds.includes(room.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{room.room_number}</p>
                      <p className="text-xs text-gray-500">{room.room_type?.name ?? ''}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={formRoomIds[0] ?? ''}
                  onChange={(e) => setFormRoomIds(e.target.value ? [e.target.value] : [])}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleziona {terms.unitLabel}...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} — {room.name} ({room.room_type?.name ?? ''})
                    </option>
                  ))}
                </select>
              )}
              {bulkMode && formRoomIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">{formRoomIds.length} camere selezionate</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {BLOCK_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Da</label>
                <Input type="date" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">A</label>
                <Input type="date" value={formTo} onChange={(e) => setFormTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <Input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Opzionale..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || formRoomIds.length === 0}
              >
                {creating ? 'Creazione...' : bulkMode ? `Crea ${formRoomIds.length} blocchi` : 'Crea blocco'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk delete */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-800">{selectedIds.size} blocchi selezionati</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Elimina selezionati
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            Deseleziona
          </Button>
        </div>
      )}

      {/* Active blocks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          Blocchi attivi
          <Badge variant="secondary">{activeBlocks.length}</Badge>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Caricamento...</div>
        ) : activeBlocks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Ban className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              Nessun blocco attivo
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg divide-y bg-white">
            {activeBlocks.map((block) => (
              <div key={block.id} className="p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(block.id)}
                  onChange={() => toggleSelect(block.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {block.room?.room_number ?? '—'} {block.room?.name ?? ''}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBlockColor(block.block_type)}`}>
                      {getBlockLabel(block.block_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {block.room?.room_type?.name ?? ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {block.date_from} → {block.date_to} ({daysBetween(block.date_from, block.date_to)} giorni)
                    {block.reason && <> — {block.reason}</>}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(block.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past blocks */}
      {pastBlocks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            Blocchi passati
            <Badge variant="secondary">{pastBlocks.length}</Badge>
          </h2>
          <div className="border rounded-lg divide-y bg-white opacity-60">
            {pastBlocks.slice(0, 20).map((block) => (
              <div key={block.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {block.room?.room_number ?? '—'} {block.room?.name ?? ''}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBlockColor(block.block_type)}`}>
                      {getBlockLabel(block.block_type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {block.date_from} → {block.date_to}
                    {block.reason && <> — {block.reason}</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
