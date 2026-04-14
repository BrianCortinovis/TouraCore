'use client'

import { useState, useTransition } from 'react'
import { Button, Input } from '@touracore/ui'
import { updateBusinessInfoAction } from '../actions'

interface BusinessInfoTabProps {
  tenantName: string
  tenantSlug: string
  settings: Record<string, unknown>
}

export function BusinessInfoTab({ tenantName, tenantSlug, settings }: BusinessInfoTabProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [name, setName] = useState(tenantName)
  const [slug, setSlug] = useState(tenantSlug)
  const [ragioneSociale, setRagioneSociale] = useState((settings['fiscal.ragione_sociale'] as string) ?? '')
  const [vatNumber, setVatNumber] = useState((settings['fiscal.vat_number'] as string) ?? '')
  const [codiceFiscale, setCodiceFiscale] = useState((settings['fiscal.codice_fiscale'] as string) ?? '')
  const [sedeVia, setSedeVia] = useState((settings['fiscal.sede_via'] as string) ?? '')
  const [sedeCap, setSedeCap] = useState((settings['fiscal.sede_cap'] as string) ?? '')
  const [sedeCitta, setSedeCitta] = useState((settings['fiscal.sede_citta'] as string) ?? '')
  const [sedeProvincia, setSedeProvincia] = useState((settings['fiscal.sede_provincia'] as string) ?? '')
  const [sedeNazione, setSedeNazione] = useState((settings['fiscal.sede_nazione'] as string) ?? 'Italia')
  const [phone, setPhone] = useState((settings['contact.phone'] as string) ?? '')
  const [email, setEmail] = useState((settings['contact.email'] as string) ?? '')
  const [website, setWebsite] = useState((settings['contact.website'] as string) ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await updateBusinessInfoAction({
        tenantName: name,
        tenantSlug: slug,
        settings: {
          'fiscal.ragione_sociale': ragioneSociale,
          'fiscal.vat_number': vatNumber,
          'fiscal.codice_fiscale': codiceFiscale,
          'fiscal.sede_via': sedeVia,
          'fiscal.sede_cap': sedeCap,
          'fiscal.sede_citta': sedeCitta,
          'fiscal.sede_provincia': sedeProvincia,
          'fiscal.sede_nazione': sedeNazione,
          'contact.phone': phone,
          'contact.email': email,
          'contact.website': website,
        },
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Dati salvati con successo.' })
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Errore durante il salvataggio.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Identità pubblica</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="tenant-name"
            label="Nome pubblico della tua attività"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Hotel Bellavista"
            required
          />
          <div className="space-y-1">
            <Input
              id="tenant-slug"
              label="Indirizzo della tua pagina pubblica"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="hotel-bellavista"
            />
            <p className="text-xs text-amber-600">
              Attenzione: cambiare l&apos;indirizzo invalida i link già condivisi
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Dati fiscali</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="ragione-sociale"
            label="Ragione sociale"
            value={ragioneSociale}
            onChange={(e) => setRagioneSociale(e.target.value)}
            placeholder="Bellavista S.r.l."
          />
          <Input
            id="vat-number"
            label="Partita IVA"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="IT01234567890"
          />
          <Input
            id="codice-fiscale"
            label="Codice Fiscale"
            value={codiceFiscale}
            onChange={(e) => setCodiceFiscale(e.target.value)}
            placeholder="01234567890"
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Sede legale</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="sede-via"
              label="Indirizzo (via e numero)"
              value={sedeVia}
              onChange={(e) => setSedeVia(e.target.value)}
              placeholder="Via Roma 1"
            />
          </div>
          <Input
            id="sede-cap"
            label="CAP"
            value={sedeCap}
            onChange={(e) => setSedeCap(e.target.value)}
            placeholder="39100"
          />
          <Input
            id="sede-citta"
            label="Città"
            value={sedeCitta}
            onChange={(e) => setSedeCitta(e.target.value)}
            placeholder="Bolzano"
          />
          <Input
            id="sede-provincia"
            label="Provincia"
            value={sedeProvincia}
            onChange={(e) => setSedeProvincia(e.target.value)}
            placeholder="BZ"
          />
          <Input
            id="sede-nazione"
            label="Nazione"
            value={sedeNazione}
            onChange={(e) => setSedeNazione(e.target.value)}
            placeholder="Italia"
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Contatti principali</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="contact-phone"
            label="Telefono principale"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 0471 123456"
          />
          <Input
            id="contact-email"
            label="Email principale"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@hotelbellavista.it"
          />
          <Input
            id="contact-website"
            label="Sito web"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.hotelbellavista.it"
          />
        </div>
      </section>

      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending} isLoading={isPending}>
          {isPending ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </form>
  )
}
