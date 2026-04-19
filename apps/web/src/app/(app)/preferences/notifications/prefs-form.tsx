'use client'

import { useState, useTransition } from 'react'
import { togglePreference } from './actions'

type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app'

interface Props {
  events: string[]
  channels: Channel[]
  initial: Record<string, boolean>
}

export function PrefsForm({ events, channels, initial }: Props) {
  const [state, setState] = useState<Record<string, boolean>>(initial)
  const [pending, start] = useTransition()

  function toggle(event: string, channel: Channel) {
    const key = `${event}|${channel}`
    const current = state[key] ?? true
    const next = !current
    setState((s) => ({ ...s, [key]: next }))
    start(async () => {
      await togglePreference({ eventKey: event, channel, enabled: next })
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2">Evento</th>
              {channels.map((c) => (
                <th key={c} className="px-4 py-2 text-center">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{ev}</td>
                {channels.map((c) => {
                  const enabled = state[`${ev}|${c}`] ?? true
                  return (
                    <td key={c} className="px-4 py-2 text-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          disabled={pending}
                          checked={enabled}
                          onChange={() => toggle(ev, c)}
                          className="h-4 w-4"
                        />
                      </label>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
