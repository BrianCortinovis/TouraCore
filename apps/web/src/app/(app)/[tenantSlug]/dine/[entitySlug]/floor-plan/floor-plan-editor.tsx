'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Trash2, Circle, Square, RectangleHorizontal } from 'lucide-react'
import {
  createRoom,
  createTable,
  deleteRoom,
  deleteTable,
  updateTable,
  updateTablePosition,
} from './actions'

const Stage = dynamic(() => import('react-konva').then((m) => m.Stage), { ssr: false })
const Layer = dynamic(() => import('react-konva').then((m) => m.Layer), { ssr: false })
const Rect = dynamic(() => import('react-konva').then((m) => m.Rect), { ssr: false })
const KCircle = dynamic(() => import('react-konva').then((m) => m.Circle), { ssr: false })
const Text = dynamic(() => import('react-konva').then((m) => m.Text), { ssr: false })
const Group = dynamic(() => import('react-konva').then((m) => m.Group), { ssr: false })

interface Room {
  id: string
  name: string
  zoneType: string
  layout: { width: number; height: number }
}

interface TableT {
  id: string
  roomId: string
  code: string
  shape: 'round' | 'square' | 'rect' | 'custom'
  seatsMin: number
  seatsMax: number
  seatsDefault: number
  attributes: string[]
  joinableWith: string[]
  position: { x: number; y: number; w: number; h: number; rotation: number }
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  rooms: Room[]
  tables: TableT[]
}

const PALETTE = [
  { shape: 'round' as const, seats: 2, w: 60, h: 60, label: 'Round 2', icon: Circle },
  { shape: 'round' as const, seats: 4, w: 80, h: 80, label: 'Round 4', icon: Circle },
  { shape: 'round' as const, seats: 6, w: 100, h: 100, label: 'Round 6', icon: Circle },
  { shape: 'square' as const, seats: 2, w: 60, h: 60, label: 'Square 2', icon: Square },
  { shape: 'square' as const, seats: 4, w: 80, h: 80, label: 'Square 4', icon: Square },
  { shape: 'rect' as const, seats: 6, w: 140, h: 70, label: 'Rect 6', icon: RectangleHorizontal },
  { shape: 'rect' as const, seats: 8, w: 180, h: 70, label: 'Rect 8', icon: RectangleHorizontal },
]

export function FloorPlanEditor({ tenantSlug, entitySlug, restaurantId, rooms, tables }: Props) {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms[0]?.id ?? null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null
  const roomTables = tables.filter((t) => t.roomId === activeRoomId)
  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null

  useEffect(() => {
    function resize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setStageSize({ width: rect.width, height: rect.height })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function handleAddRoom() {
    const name = prompt('Nome sala (es. Sala principale, Dehors):')
    if (!name) return
    startTransition(async () => {
      const result = await createRoom({
        restaurantId,
        tenantSlug,
        entitySlug,
        name,
        zoneType: 'indoor',
      })
      setActiveRoomId(result.roomId)
    })
  }

  function handleDeleteRoom() {
    if (!activeRoom) return
    if (!confirm(`Eliminare sala "${activeRoom.name}"?`)) return
    startTransition(async () => {
      await deleteRoom({ roomId: activeRoom.id, tenantSlug, entitySlug })
      setActiveRoomId(rooms.find((r) => r.id !== activeRoom.id)?.id ?? null)
    })
  }

  function handleAddTable(palette: typeof PALETTE[number]) {
    if (!activeRoomId) {
      alert('Crea prima una sala')
      return
    }
    const code = prompt('Codice tavolo (es. T1):')
    if (!code) return
    const cx = stageSize.width / 2
    const cy = stageSize.height / 2
    startTransition(async () => {
      await createTable({
        restaurantId,
        roomId: activeRoomId,
        tenantSlug,
        entitySlug,
        code,
        shape: palette.shape,
        seatsMin: 1,
        seatsMax: palette.seats,
        seatsDefault: palette.seats,
        position: { x: cx - palette.w / 2, y: cy - palette.h / 2, w: palette.w, h: palette.h, rotation: 0 },
      })
    })
  }

  function handleDragEnd(table: TableT, x: number, y: number) {
    const snapped = { x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 }
    startTransition(async () => {
      await updateTablePosition({
        tableId: table.id,
        tenantSlug,
        entitySlug,
        position: { ...table.position, x: snapped.x, y: snapped.y },
      })
    })
  }

  function handleDeleteTable(table: TableT) {
    if (!confirm(`Eliminare tavolo ${table.code}?`)) return
    startTransition(async () => {
      await deleteTable({ tableId: table.id, tenantSlug, entitySlug })
      setSelectedTableId(null)
    })
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
        <div className="border-b border-gray-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sale</p>
          <div className="mt-2 space-y-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                  r.id === activeRoomId ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r.name}
              </button>
            ))}
            <button
              onClick={handleAddRoom}
              disabled={pending}
              className="flex w-full items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              <Plus className="h-3 w-3" /> Nuova sala
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tavoli</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {PALETTE.map((p, i) => {
              const Icon = p.icon
              return (
                <button
                  key={i}
                  onClick={() => handleAddTable(p)}
                  disabled={pending || !activeRoomId}
                  className="flex flex-col items-center rounded border border-gray-200 bg-white p-1.5 text-[10px] text-gray-700 hover:border-blue-400 disabled:opacity-50"
                  title={p.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="mt-0.5">{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {selectedTable && (
          <div className="flex-1 overflow-y-auto border-b border-gray-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Tavolo {selectedTable.code}
            </p>
            <TableAttributesForm
              key={selectedTable.id}
              table={selectedTable}
              onSave={(attrs) =>
                startTransition(async () => {
                  await updateTable({
                    tableId: selectedTable.id,
                    tenantSlug,
                    entitySlug,
                    ...attrs,
                  })
                })
              }
              onDelete={() => handleDeleteTable(selectedTable)}
            />
          </div>
        )}

        {activeRoom && (
          <div className="border-t border-gray-200 p-3">
            <button
              onClick={handleDeleteRoom}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" /> Elimina sala
            </button>
          </div>
        )}
      </aside>

      <div ref={containerRef} className="relative flex-1 bg-gray-100">
        {!activeRoom ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Crea prima una sala
          </div>
        ) : (
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={(e: { target: { getStage: () => unknown } }) => {
              if (e.target === e.target.getStage()) setSelectedTableId(null)
            }}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={stageSize.width}
                height={stageSize.height}
                fill="#f3f4f6"
              />
              {/* Grid */}
              {Array.from({ length: Math.ceil(stageSize.width / 50) }).map((_, i) => (
                <Rect key={`vx${i}`} x={i * 50} y={0} width={1} height={stageSize.height} fill="#e5e7eb" />
              ))}
              {Array.from({ length: Math.ceil(stageSize.height / 50) }).map((_, i) => (
                <Rect key={`hy${i}`} x={0} y={i * 50} width={stageSize.width} height={1} fill="#e5e7eb" />
              ))}

              {roomTables.map((t) => {
                const isSelected = t.id === selectedTableId
                const isRound = t.shape === 'round'
                return (
                  <Group
                    key={t.id}
                    x={t.position.x}
                    y={t.position.y}
                    rotation={t.position.rotation}
                    draggable
                    onClick={() => setSelectedTableId(t.id)}
                    onTap={() => setSelectedTableId(t.id)}
                    onDragEnd={(e: { target: { x: () => number; y: () => number } }) =>
                      handleDragEnd(t, e.target.x(), e.target.y())
                    }
                  >
                    {isRound ? (
                      <KCircle
                        x={t.position.w / 2}
                        y={t.position.h / 2}
                        radius={t.position.w / 2}
                        fill={isSelected ? '#3b82f6' : '#ffffff'}
                        stroke={isSelected ? '#1d4ed8' : '#9ca3af'}
                        strokeWidth={2}
                      />
                    ) : (
                      <Rect
                        width={t.position.w}
                        height={t.position.h}
                        fill={isSelected ? '#3b82f6' : '#ffffff'}
                        stroke={isSelected ? '#1d4ed8' : '#9ca3af'}
                        strokeWidth={2}
                        cornerRadius={6}
                      />
                    )}
                    <Text
                      text={t.code}
                      x={0}
                      y={t.position.h / 2 - 8}
                      width={t.position.w}
                      align="center"
                      fontSize={14}
                      fontStyle="bold"
                      fill={isSelected ? '#ffffff' : '#374151'}
                    />
                    <Text
                      text={`${t.seatsDefault}p`}
                      x={0}
                      y={t.position.h / 2 + 8}
                      width={t.position.w}
                      align="center"
                      fontSize={10}
                      fill={isSelected ? '#dbeafe' : '#9ca3af'}
                    />
                  </Group>
                )
              })}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  )
}

function TableAttributesForm({
  table,
  onSave,
  onDelete,
}: {
  table: TableT
  onSave: (attrs: { code?: string; seatsMin?: number; seatsMax?: number; seatsDefault?: number; attributes?: string[] }) => void
  onDelete: () => void
}) {
  const [code, setCode] = useState(table.code)
  const [seatsMin, setSeatsMin] = useState(table.seatsMin)
  const [seatsMax, setSeatsMax] = useState(table.seatsMax)
  const [seatsDefault, setSeatsDefault] = useState(table.seatsDefault)
  const [attrs, setAttrs] = useState<Set<string>>(new Set(table.attributes))

  const ATTR_OPTIONS = ['window', 'quiet', 'pet_ok', 'high_chair_ok', 'vip']

  function toggleAttr(a: string) {
    const next = new Set(attrs)
    if (next.has(a)) next.delete(a)
    else next.add(a)
    setAttrs(next)
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      <div>
        <label className="text-gray-600">Codice</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <div>
          <label className="text-gray-600">Min</label>
          <input
            type="number"
            value={seatsMin}
            min={1}
            onChange={(e) => setSeatsMin(Number(e.target.value))}
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <label className="text-gray-600">Default</label>
          <input
            type="number"
            value={seatsDefault}
            min={1}
            onChange={(e) => setSeatsDefault(Number(e.target.value))}
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
          />
        </div>
        <div>
          <label className="text-gray-600">Max</label>
          <input
            type="number"
            value={seatsMax}
            min={1}
            onChange={(e) => setSeatsMax(Number(e.target.value))}
            className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1"
          />
        </div>
      </div>
      <div>
        <label className="text-gray-600">Attributi</label>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {ATTR_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAttr(a)}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${
                attrs.has(a) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 pt-1">
        <button
          onClick={() =>
            onSave({ code, seatsMin, seatsMax, seatsDefault, attributes: Array.from(attrs) })
          }
          className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Salva
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
