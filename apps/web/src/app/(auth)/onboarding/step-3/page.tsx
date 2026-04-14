import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@touracore/db/server'
import Step3Form from './step-3-form'

export default async function OnboardingStep3() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense>
      <Step3Form />
    </Suspense>
  )
}
