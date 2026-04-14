import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@touracore/auth'
import Step2Form from './step-2-form'

export default async function OnboardingStep2() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense>
      <Step2Form />
    </Suspense>
  )
}
