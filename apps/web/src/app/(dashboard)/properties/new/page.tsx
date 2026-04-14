import { PropertyForm } from '../components/property-form'

export const metadata = {
  title: 'Nuova struttura — TouraCore',
}

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nuova struttura</h1>
      <PropertyForm />
    </div>
  )
}
