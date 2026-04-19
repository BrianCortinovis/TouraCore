import { unsubscribeByToken } from '@touracore/notifications'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ e?: string; k?: string }>
}

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { token } = await params
  const { e: email, k: eventKey } = await searchParams

  if (!email || !eventKey) {
    return <Card title="Link non valido" body="Il link di disiscrizione è incompleto." error />
  }

  const res = await unsubscribeByToken(token, email, eventKey)
  if (!res.ok) {
    return <Card title="Token non valido" body={`Errore: ${res.error ?? 'unknown'}`} error />
  }

  return (
    <Card
      title="Disiscrizione completata"
      body={`L'indirizzo ${email} non riceverà più notifiche di tipo "${eventKey}". Puoi riabilitarle dalle preferenze account.`}
    />
  )
}

function Card({ title, body, error }: { title: string; body: string; error?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className={`max-w-md rounded-2xl border bg-white p-6 shadow-sm ${error ? 'border-rose-200' : 'border-emerald-200'}`}>
        <h1 className={`text-lg font-semibold ${error ? 'text-rose-700' : 'text-emerald-700'}`}>{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
      </div>
    </div>
  )
}
