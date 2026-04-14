'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Badge } from '@touracore/ui'
import type { Notification } from '@touracore/notifications'
import {
  listNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
  deleteNotificationAction,
} from './actions'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    const items = await listNotificationsAction(filter === 'unread')
    setNotifications(items as Notification[])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkRead = async (id: string) => {
    await markAsReadAction(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
  }

  const handleMarkAllRead = async () => {
    await markAllAsReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const channelLabel: Record<string, string> = {
    in_app: 'In-app',
    email: 'Email',
    push: 'Push',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
        <Button variant="outline" onClick={handleMarkAllRead}>
          Segna tutte lette
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Tutte
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Non lette
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔔</div>
          <p className="text-lg">
            {filter === 'unread' ? 'Nessuna notifica non letta' : 'Nessuna notifica'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 border rounded-lg ${!n.read_at ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {!n.read_at && (
                    <span className="mt-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{channelLabel[n.channel] ?? n.channel}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!n.read_at && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Segna letta
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
