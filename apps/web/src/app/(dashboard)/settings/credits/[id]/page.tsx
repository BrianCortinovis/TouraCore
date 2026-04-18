import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getCreditById, listCreditTransactions } from '@touracore/vouchers/server'

export const dynamic = 'force-dynamic'

export default async function CreditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.tenant) redirect('/login')

  const credit = await getCreditById({ id, tenantId: bootstrap.tenant.id })
  if (!credit) notFound()

  const transactions = await listCreditTransactions({
    creditInstrumentId: id,
    tenantId: bootstrap.tenant.id,
    limit: 100,
  })

  return (
    <div className="space-y-6">
      <nav className="text-sm">
        <Link
          href={bootstrap.tenant?.slug ? `/${bootstrap.tenant.slug}/settings/credits` : '/settings/credits'}
          className="text-blue-600 hover:underline"
        >
          ← Torna a Credits Studio
        </Link>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {credit.kind.replace('_', ' ')}
        </p>
        <h1 className="mt-1 font-mono text-2xl font-bold text-gray-900">
          ****-****-****-{credit.code_last4}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Emesso il {new Date(credit.issued_at).toLocaleString('it-IT')}
          {credit.issued_via && ` · via ${credit.issued_via}`}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Stato" value={credit.status} />
        <Stat label="Importo iniziale" value={`€${Number(credit.initial_amount).toFixed(2)}`} />
        <Stat
          label={credit.kind === 'promo_code' ? 'Utilizzi' : 'Saldo residuo'}
          value={
            credit.kind === 'promo_code'
              ? `${credit.uses_count}${credit.max_uses ? ` / ${credit.max_uses}` : ''}`
              : `€${Number(credit.current_balance).toFixed(2)}`
          }
        />
        <Stat
          label="Scadenza"
          value={
            credit.expires_at ? new Date(credit.expires_at).toLocaleDateString('it-IT') : 'Nessuna'
          }
        />
      </div>

      {credit.recipient_email && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Destinatario</h3>
          <p className="mt-2 text-sm">
            <strong>{credit.recipient_name}</strong> — {credit.recipient_email}
          </p>
          {credit.personal_message && (
            <blockquote className="mt-2 rounded-md border-l-2 border-gray-300 bg-gray-50 p-3 text-sm italic text-gray-700">
              {credit.personal_message}
            </blockquote>
          )}
        </div>
      )}

      <div className="rounded-md border border-gray-200 bg-white">
        <header className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-bold text-gray-900">Storico transazioni</h3>
        </header>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Quando</th>
              <th className="px-4 py-2 text-left font-semibold">Tipo</th>
              <th className="px-4 py-2 text-right font-semibold">Importo</th>
              <th className="px-4 py-2 text-right font-semibold">Saldo dopo</th>
              <th className="px-4 py-2 text-left font-semibold">Contesto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nessuna transazione.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {new Date(tx.created_at).toLocaleString('it-IT')}
                  </td>
                  <td className="px-4 py-2 text-xs uppercase text-gray-700">{tx.type}</td>
                  <td
                    className={`px-4 py-2 text-right font-mono text-xs ${
                      Number(tx.amount) < 0 ? 'text-red-600' : 'text-green-700'
                    }`}
                  >
                    {Number(tx.amount) >= 0 ? '+' : ''}€{Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-gray-600">
                    €{Number(tx.balance_after).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {tx.vertical ?? ''}
                    {tx.reason ? ` · ${tx.reason}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <details className="rounded-md border border-gray-200 bg-white p-4 text-xs">
        <summary className="cursor-pointer font-semibold text-gray-700">Metadata tecnico</summary>
        <pre className="mt-2 overflow-auto bg-gray-50 p-2 text-[10px]">
          {JSON.stringify(credit, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
