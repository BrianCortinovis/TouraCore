export default function BillingSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fatturazione</h1>
        <p className="mt-1 text-sm text-gray-500">
          Piano, metodi di pagamento e storico fatture
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          L&apos;integrazione Stripe e la gestione piani saranno disponibili a breve.
        </p>
      </div>
    </div>
  )
}
