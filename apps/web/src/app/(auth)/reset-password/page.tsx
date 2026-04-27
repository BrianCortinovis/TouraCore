import { cookies } from 'next/headers'
import { ResetPasswordClient } from './ResetPasswordClient'

export const dynamic = 'force-dynamic'

const RECOVERY_COOKIE = '__touracore_pwd_recovery'

export default async function ResetPasswordPage() {
  const cookieStore = await cookies()
  const hasRecoverySentinel = cookieStore.get(RECOVERY_COOKIE)?.value === '1'
  return <ResetPasswordClient initialGate={hasRecoverySentinel ? 'recovery' : 'no_recovery'} />
}
