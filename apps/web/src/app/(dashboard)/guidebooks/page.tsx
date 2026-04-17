'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Input, Select, Modal, DataTable, Badge } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import {
  listGuidebooksAction,
  createGuidebookAction,
  addGuidebookItemAction,
  publishGuidebookAction,
} from '../competitive-actions'

interface Guidebook {
  id: string
  title: string
  intro: string | null
  is_published: boolean
  language: string
  created_at: string
  guidebook_items?: { count: number }[]
}

export default function GuidebooksPage() {
  const { property, tenant } = useAuthStore()
  const [books, setBooks] = useState<Guidebook[]>([])
  const [open, setOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', intro: '', language: 'it' })
  const [itemForm, setItemForm] = useState({ category: 'restaurant', name: '', description: '', address: '', url: '' })

  const load = useCallback(async () => {
    if (!property) return
    const data = await listGuidebooksAction(property.id)
    setBooks(data as Guidebook[])
  }, [property])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!tenant || !property || !form.title) return
    await createGuidebookAction({
      tenantId: tenant.id,
      entityId: property.id,
      title: form.title,
      intro: form.intro,
      language: form.language,
    })
    setOpen(false)
    setForm({ title: '', intro: '', language: 'it' })
    await load()
  }

  async function handleAddItem() {
    if (!itemOpen || !itemForm.name) return
    await addGuidebookItemAction({
      guidebookId: itemOpen,
      category: itemForm.category,
      name: itemForm.name,
      description: itemForm.description,
      address: itemForm.address,
      url: itemForm.url,
    })
    setItemOpen(null)
    setItemForm({ category: 'restaurant', name: '', description: '', address: '', url: '' })
    await load()
  }

  async function handlePublish(id: string, pub: boolean) {
    await publishGuidebookAction(id, pub)
    await load()
  }

  if (!property) return <div className="py-20 text-center text-gray-500">Caricamento struttura...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Guide locali</h1>
        <Button onClick={() => setOpen(true)}>Nuova guida</Button>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        Le guide pubblicate sono visibili da portal guest e app mobile. Aggiungi POI manualmente o genera auto con AI (quando credenziali Google Places + LLM configurate).
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
          <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{b.title}</h3>
              <Badge variant={b.is_published ? 'success' : 'secondary'}>
                {b.is_published ? 'Pubblicata' : 'Bozza'}
              </Badge>
            </div>
            {b.intro && <p className="mt-2 text-sm text-gray-600">{b.intro}</p>}
            <div className="mt-2 text-xs text-gray-500">
              {b.guidebook_items?.[0]?.count ?? 0} POI · {b.language.toUpperCase()}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setItemOpen(b.id)}>+ POI</Button>
              <Button size="sm" variant="ghost" onClick={() => handlePublish(b.id, !b.is_published)}>
                {b.is_published ? 'Nascondi' : 'Pubblica'}
              </Button>
            </div>
          </div>
        ))}
        {books.length === 0 && <div className="col-span-full py-10 text-center text-gray-500">Nessuna guida.</div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuova guida">
        <div className="space-y-4">
          <Input label="Titolo" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <textarea
            placeholder="Intro"
            value={form.intro}
            onChange={(e) => setForm((p) => ({ ...p, intro: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Select
            label="Lingua"
            options={[
              { value: 'it', label: 'Italiano' },
              { value: 'en', label: 'English' },
              { value: 'de', label: 'Deutsch' },
              { value: 'fr', label: 'Francais' },
              { value: 'es', label: 'Espanol' },
            ]}
            value={form.language}
            onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={!form.title}>Crea</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!itemOpen} onClose={() => setItemOpen(null)} title="Aggiungi POI">
        <div className="space-y-4">
          <Select
            label="Categoria"
            options={[
              { value: 'restaurant', label: 'Ristorante' },
              { value: 'attraction', label: 'Attrazione' },
              { value: 'nightlife', label: 'Nightlife' },
              { value: 'shopping', label: 'Shopping' },
              { value: 'transport', label: 'Trasporti' },
              { value: 'beach', label: 'Spiaggia' },
              { value: 'museum', label: 'Museo' },
              { value: 'activity', label: 'Attivita' },
              { value: 'tip', label: 'Consiglio' },
              { value: 'other', label: 'Altro' },
            ]}
            value={itemForm.category}
            onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}
          />
          <Input label="Nome" value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Indirizzo" value={itemForm.address} onChange={(e) => setItemForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="URL" value={itemForm.url} onChange={(e) => setItemForm((p) => ({ ...p, url: e.target.value }))} />
          <textarea
            placeholder="Descrizione"
            value={itemForm.description}
            onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setItemOpen(null)}>Annulla</Button>
            <Button onClick={handleAddItem} disabled={!itemForm.name}>Aggiungi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
