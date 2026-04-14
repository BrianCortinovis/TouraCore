import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import Link from 'next/link'

export default async function OnboardingStep1() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Se ha già un tenant, salta a step successivo
  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (memberships && memberships.length > 0) {
    redirect('/onboarding/step-2')
  }

  return (
    <div className="flex min-h-screen">
      {/* Pannello branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white">TouraCore</h1>
          <p className="mt-3 text-lg text-blue-100">
            La piattaforma per gestire la tua attività turistica
          </p>
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-xl font-bold text-white">T</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Benvenuto!</h2>
          <p className="mt-3 text-gray-500">
            Iniziamo a configurare la tua attività. Ci vorranno pochi minuti.
          </p>

          <div className="mt-8 space-y-3 text-left text-sm text-gray-600">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">1</div>
              <span>Configurazione iniziale</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">2</div>
              <span>Dati della tua attività</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">3</div>
              <span>La tua prima struttura</span>
            </div>
          </div>

          <Link
            href="/onboarding/step-2"
            className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continua
          </Link>
        </div>
      </div>
    </div>
  )
}
