import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@touracore/auth'
import Step3Form from './step-3-form'

export default async function OnboardingStep3() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense>
      <Step3Form />
    </Suspense>
  )
}
