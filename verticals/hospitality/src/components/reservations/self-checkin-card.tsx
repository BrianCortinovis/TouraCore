'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@touracore/ui'
import { ACCESS_TYPE_LABELS } from '../../constants'
import type { SelfCheckinConfig } from '../../types/database'
import {
  KeyRound,
  Wifi,
  Send,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { useState } from 'react'

interface SelfCheckinCardProps {
  config: SelfCheckinConfig | null
  guestName?: string
}

export function SelfCheckinCard({ config, guestName }: SelfCheckinCardProps) {
  const [copied, setCopied] = useState(false)

  if (!config) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4 text-gray-400" />
            Self Check-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Nessuna configurazione self check-in per questa unità</p>
        </CardContent>
      </Card>
    )
  }

  function handleCopyCode() {
    if (config?.access_code) {
      navigator.clipboard.writeText(config.access_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4 text-blue-600" />
            Self Check-in
          </CardTitle>
          <Badge variant="secondary">
            {ACCESS_TYPE_LABELS[config.access_type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {config.access_code && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">Codice accesso</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-gray-900">{config.access_code}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {config.wifi_network && (
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700">{config.wifi_network}</span>
              {config.wifi_password && (
                <span className="font-mono text-xs text-gray-500">({config.wifi_password})</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Send className="h-3.5 w-3.5" />
            {config.auto_send
              ? `Invio automatico ${config.send_hours_before}h prima del check-in`
              : 'Invio manuale'
            }
          </div>

          {config.checkin_instructions && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Istruzioni check-in</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {config.checkin_instructions.length > 200
                  ? config.checkin_instructions.substring(0, 200) + '...'
                  : config.checkin_instructions
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
