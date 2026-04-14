'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from '@touracore/ui'
import { useState, useTransition } from 'react'
import { DEPOSIT_STATUS_LABELS } from '../../constants'
import type { SecurityDeposit, DepositStatus } from '../../types/database'
import { collectDeposit, returnDeposit } from '../../actions/deposits'
import {
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Euro,
  AlertCircle,
} from 'lucide-react'

interface SecurityDepositCardProps {
  deposit: SecurityDeposit | null
  orgId: string
  reservationId: string
  defaultAmount?: number
}

const STATUS_COLORS: Record<DepositStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  collected: 'bg-blue-100 text-blue-800',
  partially_returned: 'bg-orange-100 text-orange-800',
  returned: 'bg-green-100 text-green-800',
  forfeited: 'bg-red-100 text-red-800',
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function SecurityDepositCard({ deposit, orgId }: SecurityDepositCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleCollect() {
    if (!deposit) return
    startTransition(async () => {
      try {
        await collectDeposit(orgId, deposit.id)
      } catch (err) {
        console.error('Failed to collect deposit:', err)
      }
    })
  }

  function handleReturn() {
    if (!deposit) return
    startTransition(async () => {
      try {
        await returnDeposit(orgId, deposit.id, deposit.amount)
      } catch (err) {
        console.error('Failed to return deposit:', err)
      }
    })
  }

  if (!deposit) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-gray-400" />
            Cauzione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            Nessuna cauzione registrata
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Cauzione
          </CardTitle>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[deposit.status])}>
            {DEPOSIT_STATUS_LABELS[deposit.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Importo</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(deposit.amount)}</span>
          </div>

          {deposit.collected_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Incassata il</span>
              <span className="text-gray-700">
                {new Date(deposit.collected_at).toLocaleDateString('it-IT')}
              </span>
            </div>
          )}

          {deposit.returned_at && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Restituita il</span>
                <span className="text-gray-700">
                  {new Date(deposit.returned_at).toLocaleDateString('it-IT')}
                </span>
              </div>
              {deposit.returned_amount !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Importo restituito</span>
                  <span className="font-medium text-green-700">{formatCurrency(deposit.returned_amount)}</span>
                </div>
              )}
              {deposit.deduction_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Trattenuto</span>
                  <span className="font-medium text-red-600">{formatCurrency(deposit.deduction_amount)}</span>
                </div>
              )}
              {deposit.deduction_reason && (
                <div className="text-xs text-gray-500">
                  Motivo: {deposit.deduction_reason}
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {deposit.status === 'pending' && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={handleCollect}>
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Incassa
              </Button>
            )}
            {deposit.status === 'collected' && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={handleReturn}>
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                Restituisci
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
