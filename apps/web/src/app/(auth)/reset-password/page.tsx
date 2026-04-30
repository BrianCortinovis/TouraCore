import { ResetPasswordClient } from './ResetPasswordClient'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  // Gate verificato lato client via PASSWORD_RECOVERY event Supabase + session AAL.
  // Non serve cookie custom: Supabase emette session scope-recovery solo dopo
  // verifica token email (single-use, 1h TTL) e updateUser è ammesso solo con
  // session attiva. Post-success forziamo signOut globale che revoca refresh token.
  return <ResetPasswordClient initialGate="recovery" />
}
