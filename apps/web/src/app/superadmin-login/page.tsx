import { SuperadminLoginForm } from './login-form'
import { Shield } from 'lucide-react'

export const metadata = {
  title: 'Superadmin — TouraCore',
  robots: 'noindex, nofollow',
}

export default function SuperadminLoginPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-full bg-red-500/10 p-3">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Accesso Superadmin</h1>
          <p className="mt-1 text-sm text-gray-400">
            Area riservata — solo amministratori piattaforma
          </p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
          <SuperadminLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Questa pagina è separata dal login utenti.
          <br />
          Accessi non autorizzati sono registrati.
        </p>
      </div>
    </div>
  )
}
