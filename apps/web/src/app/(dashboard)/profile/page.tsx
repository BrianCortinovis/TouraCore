import { ProfileForm } from './profile-form'

export const metadata = {
  title: 'Profilo — TouraCore',
}

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profilo</h1>
      <ProfileForm />
    </div>
  )
}
