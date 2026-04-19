import { resolveTenantLegal } from '@/lib/tenant-legal'
import { BRAND_CONFIG } from '@/config/brand'

interface GlobalFooterProps {
  tenantSlug?: string | null
  minimal?: boolean
}

export async function GlobalFooter({ tenantSlug, minimal = false }: GlobalFooterProps) {
  const legal = await resolveTenantLegal(tenantSlug)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {!minimal && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{BRAND_CONFIG.brand}</h3>
              <p className="text-gray-600">
                Piattaforma SaaS per la gestione multi-vertical di strutture ricettive, ristoranti, noleggio bici ed esperienze.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Legale</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="/legal/privacy" className="hover:text-blue-600 hover:underline">Privacy Policy</a></li>
                <li><a href="/legal/cookie-policy" className="hover:text-blue-600 hover:underline">Cookie Policy</a></li>
                <li><a href="/legal/terms" className="hover:text-blue-600 hover:underline">Termini</a></li>
                <li><a href="/legal/dpa" className="hover:text-blue-600 hover:underline">DPA</a></li>
                <li><a href="/legal/sub-processors" className="hover:text-blue-600 hover:underline">Sub-processor</a></li>
                <li><a href="/legal/accessibility-statement" className="hover:text-blue-600 hover:underline">Accessibilità</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Account</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="/account/privacy" className="hover:text-blue-600 hover:underline">I tuoi dati</a></li>
                <li><a href="/preferences/notifications" className="hover:text-blue-600 hover:underline">Preferenze notifiche</a></li>
                <li><a href="/unsubscribe" className="hover:text-blue-600 hover:underline">Unsubscribe</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contatti</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href={`mailto:${BRAND_CONFIG.contact_email}`} className="hover:text-blue-600 hover:underline">{BRAND_CONFIG.contact_email}</a></li>
                <li><a href={`mailto:${BRAND_CONFIG.dpo_email}`} className="hover:text-blue-600 hover:underline">DPO: {BRAND_CONFIG.dpo_email}</a></li>
              </ul>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-200 text-xs text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <strong className="text-gray-700">{legal.legal_name}</strong>
            {legal.address && <> — {legal.address}</>}
            {legal.vat_number && <> · {legal.vat_number}</>}
            {legal.fiscal_code && <> · CF {legal.fiscal_code}</>}
            {legal.rea && <> · REA {legal.rea}</>}
          </div>
          <div>
            © {year} {BRAND_CONFIG.brand}. Tutti i diritti riservati.
          </div>
        </div>
      </div>
    </footer>
  )
}
