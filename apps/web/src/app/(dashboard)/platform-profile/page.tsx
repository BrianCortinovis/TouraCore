import { loadProfileFormState } from './actions'
import { ProfileEditor } from './profile-editor'

export const dynamic = 'force-dynamic'

export default async function PlatformProfilePage() {
  const res = await loadProfileFormState()
  if (!res.success || !res.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Profilo pubblico</h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {res.error ?? 'Errore caricamento'}
        </div>
      </div>
    )
  }
  return <ProfileEditor state={res.data} />
}
