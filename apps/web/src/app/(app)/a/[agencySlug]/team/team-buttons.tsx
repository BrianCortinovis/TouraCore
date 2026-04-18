'use client'

import { useTransition } from 'react'
import { revokeInvitationAction, removeMembershipAction } from './actions'

export function RevokeButton({ agencySlug, invitationId }: { agencySlug: string; invitationId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await revokeInvitationAction(agencySlug, invitationId) })}
      className="rounded border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? '…' : 'Revoca'}
    </button>
  )
}

export function RemoveButton({ agencySlug, membershipId }: { agencySlug: string; membershipId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await removeMembershipAction(agencySlug, membershipId) })}
      className="rounded border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? '…' : 'Rimuovi'}
    </button>
  )
}
