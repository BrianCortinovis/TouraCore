import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@touracore/db/server'
import Step2Form from './step-2-form'

export default async function OnboardingStep2() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense>
      <Step2Form />
    </Suspense>
  )
}
