'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from '@touracore/ui'
import { CONTRACT_STATUS_LABELS } from '../../constants'
import type { RentalContract, ContractStatus } from '../../types/database'
import {
  FileSignature,
  Download,
  ExternalLink,
  AlertCircle,
  Plus,
} from 'lucide-react'

interface ContractLinkCardProps {
  contract: RentalContract | null
  reservationId: string
}

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  signed: 'bg-green-100 text-green-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function ContractLinkCard({ contract, reservationId }: ContractLinkCardProps) {
  if (!contract) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileSignature className="h-4 w-4 text-gray-400" />
            Contratto di Locazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Nessun contratto associato
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/contracts/new?reservation=${reservationId}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Crea
            </Button>
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
            <FileSignature className="h-4 w-4 text-blue-600" />
            Contratto di Locazione
          </CardTitle>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[contract.status])}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Numero</span>
            <span className="font-medium text-gray-900">{contract.contract_number}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Canone</span>
            <span className="font-medium text-gray-900">{formatCurrency(contract.rental_amount)}</span>
          </div>
          {contract.security_deposit_amount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Cauzione</span>
              <span className="text-gray-700">{formatCurrency(contract.security_deposit_amount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Periodo</span>
            <span className="text-gray-700">
              {new Date(contract.start_date).toLocaleDateString('it-IT')} - {new Date(contract.end_date).toLocaleDateString('it-IT')}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = `/contracts?id=${contract.id}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Dettagli
            </Button>
            {contract.pdf_url && (
              <Button size="sm" variant="outline">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
